/**
 * Client-side real-time alpha refinement and backlit halo de-bleed.
 * STRICTLY preserves 100% of solid foreground subject pixels while
 * selectively trimming faint ambient glow around the outer boundary.
 */
export function refineAlphaMask(
  sourceImageData: ImageData,
  haloThresholdPercent: number, // 0 - 90
  erodePixels: number,          // 0 to 4
  featherRadius: number         // 0 to 4
): ImageData {
  // If no adjustments are requested, return original untouched
  if (haloThresholdPercent <= 0 && erodePixels <= 0 && featherRadius <= 0) {
    return sourceImageData;
  }

  const width = sourceImageData.width;
  const height = sourceImageData.height;
  const output = new ImageData(
    new Uint8ClampedArray(sourceImageData.data),
    width,
    height
  );

  const data = output.data;
  const totalPixels = width * height;
  const threshold = Math.round((haloThresholdPercent / 100) * 255);

  // 1. Halo Cutoff: Only drops out faint ambient light (alpha <= threshold)
  // CRITICAL: Solid foreground pixels (alpha >= 240) are NEVER touched!
  if (threshold > 0) {
    for (let i = 0; i < totalPixels; i++) {
      const aIdx = i * 4 + 3;
      const alpha = data[aIdx];
      // Only trim faint glow; never cut through solid subject
      if (alpha > 0 && alpha <= threshold) {
        data[aIdx] = 0;
      }
    }
  }

  // 2. Morphological Edge Erosion (shaves border fringe only at transparency boundaries)
  if (erodePixels > 0) {
    const currentAlpha = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      currentAlpha[i] = data[i * 4 + 3];
    }

    const radius = Math.min(3, erodePixels);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        // Skip pixels that are already transparent
        if (currentAlpha[idx] === 0) continue;

        // Check if this pixel is near an outer boundary (border fringe)
        let hasTransparentNeighbor = false;
        let minNeighbor = currentAlpha[idx];

        for (let dy = -radius; dy <= radius && !hasTransparentNeighbor; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) {
            hasTransparentNeighbor = true;
            break;
          }
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= width || currentAlpha[ny * width + nx] === 0) {
              hasTransparentNeighbor = true;
              break;
            }
            const nVal = currentAlpha[ny * width + nx];
            if (nVal < minNeighbor) minNeighbor = nVal;
          }
        }

        // Only erode outer boundary edges that border empty space
        if (hasTransparentNeighbor) {
          data[idx * 4 + 3] = 0;
        }
      }
    }
  }

  // 3. Anti-aliasing Feather on boundary transitions
  if (featherRadius > 0) {
    const alphaCopy = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      alphaCopy[i] = data[i * 4 + 3];
    }

    const r = Math.min(2, Math.round(featherRadius));
    const windowSize = (2 * r + 1) * (2 * r + 1);

    for (let y = r; y < height - r; y++) {
      for (let x = r; x < width - r; x++) {
        const idx = y * width + x;
        // Only smooth actual transition borders
        if (alphaCopy[idx] > 0 && alphaCopy[idx] < 255) {
          let sum = 0;
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              sum += alphaCopy[(y + dy) * width + (x + dx)];
            }
          }
          data[idx * 4 + 3] = Math.round(sum / windowSize);
        }
      }
    }
  }

  return output;
}
