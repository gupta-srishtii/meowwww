import * as THREE from 'three';

/**
 * Lightweight client-side procedural CanvasTexture cache (`Phase 2C`).
 * Adds stylized fabric weaves, floral/plaid prints, mountain asphalt grain,
 * and temple stone/gopuram detail without external binary bloat or personal files.
 */

const textureCache = new Map<string, THREE.CanvasTexture>();

function createCachedCanvasTexture(
  key: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  options?: { repeatX?: number; repeatY?: number }
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const existing = textureCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  draw(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  if (options?.repeatX || options?.repeatY) {
    texture.repeat.set(options.repeatX ?? 1, options.repeatY ?? 1);
  }
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  textureCache.set(key, texture);
  return texture;
}

/**
 * Cream & indigo-slate paisley/floral peasant top print matching Srishti's verified reference outfit.
 */
export function getSrishtiFloralPeplumTexture(): THREE.CanvasTexture | null {
  return createCachedCanvasTexture(
    'srishti_floral_peplum',
    256,
    (ctx, s) => {
      ctx.fillStyle = '#e5dfd3';
      ctx.fillRect(0, 0, s, s);

      // Subtle smocked fabric thread grain
      ctx.strokeStyle = 'rgba(130, 122, 108, 0.16)';
      ctx.lineWidth = 1;
      for (let y = 0; y < s; y += 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
      }

      // Indigo-slate, charcoal-blue & muted dusty-rose paisley motifs
      const palette = ['#44566e', '#2f3e52', '#64748b', '#8d5d58', '#a38974'];
      for (let i = 0; i < 64; i++) {
        const px = ((i * 53) % s) + ((i % 3) * 7 - 7);
        const py = ((i * 37) % s) + ((i % 4) * 5 - 8);
        const r = 6 + (i % 5) * 2.2;
        const color = palette[i % palette.length];

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(((i * 31) % 360) * (Math.PI / 180));

        // Paisley teardrop outer shape
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.95, r * 0.56, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner cream floral center dot
        ctx.fillStyle = '#ebe5da';
        ctx.beginPath();
        ctx.arc(r * 0.18, 0, r * 0.28, 0, Math.PI * 2);
        ctx.fill();

        // Tiny surrounding vine leaf dots
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(-r * 0.9, r * 0.3, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
    { repeatX: 2, repeatY: 2 }
  );
}

/**
 * Brown, charcoal & cream checked flannel overshirt texture from the group overlook reference.
 */
export function getPlaidShirtTexture(): THREE.CanvasTexture | null {
  return createCachedCanvasTexture(
    'friend_plaid_shirt',
    128,
    (ctx, s) => {
      ctx.fillStyle = '#3b2e2a';
      ctx.fillRect(0, 0, s, s);

      // Warm tan/cream thick checks
      const bands = [0, 32, 64, 96];
      for (const b of bands) {
        ctx.fillStyle = 'rgba(208, 187, 166, 0.36)';
        ctx.fillRect(b, 0, 14, s);
        ctx.fillRect(0, b, s, 14);

        ctx.fillStyle = 'rgba(18, 17, 20, 0.45)';
        ctx.fillRect(b + 16, 0, 12, s);
        ctx.fillRect(0, b + 16, s, 12);

        ctx.fillStyle = 'rgba(148, 108, 86, 0.25)';
        ctx.fillRect(b + 28, 0, 3, s);
        ctx.fillRect(0, b + 28, s, 3);
      }
    },
    { repeatX: 2, repeatY: 2 }
  );
}

/**
 * Medium-dark washed indigo twill denim texture.
 */
export function getDenimTexture(): THREE.CanvasTexture | null {
  return createCachedCanvasTexture('indigo_denim', 128, (ctx, s) => {
    ctx.fillStyle = '#1d4477';
    ctx.fillRect(0, 0, s, s);

    for (let y = 0; y < s; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(9,19,42,0.12)';
      ctx.fillRect(0, y, s, 1.5);
    }
    for (let i = 0; i < 160; i++) {
      const x = (i * 29) % s;
      const y = (i * 47) % s;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(147, 197, 253, 0.08)' : 'rgba(15, 23, 42, 0.1)';
      ctx.fillRect(x, y, 2, 2);
    }
  });
}

/**
 * Weathered mountain road asphalt texture with fine stone aggregate speckle.
 */
export function getAsphaltRoadTexture(): THREE.CanvasTexture | null {
  return createCachedCanvasTexture(
    'mountain_asphalt',
    256,
    (ctx, s) => {
      ctx.fillStyle = '#333b48';
      ctx.fillRect(0, 0, s, s);

      for (let i = 0; i < 1400; i++) {
        const x = (i * 73) % s;
        const y = (i * 139) % s;
        const light = i % 3 === 0;
        ctx.fillStyle = light ? 'rgba(148, 163, 184, 0.16)' : 'rgba(15, 23, 42, 0.22)';
        ctx.fillRect(x, y, 2, 2);
      }

      // Soft tire-track wear along dual lane paths
      const grad = ctx.createLinearGradient(0, 0, s, 0);
      grad.addColorStop(0, 'rgba(22, 27, 36, 0.28)');
      grad.addColorStop(0.25, 'rgba(71, 85, 105, 0.05)');
      grad.addColorStop(0.5, 'rgba(30, 41, 59, 0.16)');
      grad.addColorStop(0.75, 'rgba(71, 85, 105, 0.05)');
      grad.addColorStop(1, 'rgba(22, 27, 36, 0.28)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);
    },
    { repeatX: 1, repeatY: 42 }
  );
}

/**
 * Warm Himalayan sandstone flagstone texture for temple courtyards.
 */
export function getStoneCourtyardTexture(): THREE.CanvasTexture | null {
  return createCachedCanvasTexture(
    'neelkanth_stone_courtyard',
    256,
    (ctx, s) => {
      ctx.fillStyle = '#9b8f7e';
      ctx.fillRect(0, 0, s, s);

      const rows = 4;
      const rowH = s / rows;
      for (let r = 0; r < rows; r++) {
        const cols = r % 2 === 0 ? 4 : 3;
        const colW = s / cols;
        const offset = (r % 2) * (colW * 0.4);
        for (let c = -1; c <= cols; c++) {
          const x = c * colW + offset;
          const y = r * rowH;
          const shade = ((r * 7 + c * 11) % 3) * 8;
          ctx.fillStyle = `rgb(${164 - shade}, ${152 - shade}, ${134 - shade})`;
          ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

          ctx.strokeStyle = 'rgba(71, 64, 54, 0.42)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, colW - 2, rowH - 2);
        }
      }
    },
    { repeatX: 7, repeatY: 7 }
  );
}

/**
 * Stylized painted horizontal tier pattern inspired by Neelkanth Mahadev's Dravidian gopuram & shikhara.
 */
export function getGopuramDetailTexture(): THREE.CanvasTexture | null {
  return createCachedCanvasTexture('neelkanth_gopuram_tiers', 256, (ctx, s) => {
    ctx.fillStyle = '#e59228';
    ctx.fillRect(0, 0, s, s);

    const bands: Array<[number, number, string]> = [
      [0, 32, '#d97706'],
      [32, 26, '#b91c1c'],
      [58, 22, '#0ea5e9'],
      [80, 36, '#fef3c7'],
      [116, 26, '#c2410c'],
      [142, 24, '#0284c7'],
      [166, 34, '#f59e0b'],
      [200, 26, '#991b1b'],
      [226, 30, '#fef3c7'],
    ];

    for (const [y, h, color] of bands) {
      ctx.fillStyle = color;
      ctx.fillRect(0, y, s, h);
      // Decorative pillared alcove notches
      ctx.fillStyle = 'rgba(24, 24, 27, 0.22)';
      for (let x = 12; x < s; x += 28) {
        ctx.fillRect(x, y + 4, 10, h - 8);
      }
      ctx.fillStyle = 'rgba(255, 248, 220, 0.35)';
      ctx.fillRect(0, y, s, 2);
    }
  });
}

