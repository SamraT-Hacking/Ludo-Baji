export const LudoBoardSVG = `
<svg width="max" height="max" viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <style>
            .red-base { fill: var(--red-base); }
            .green-base { fill: var(--green-base); }
            .yellow-base { fill: var(--yellow-base); }
            .blue-base { fill: var(--blue-base); }
            .path { fill: var(--path-color); stroke: var(--path-stroke-color); stroke-width: 0.05; }
            .safe { fill: var(--safe-color); }
            .red-path { fill: var(--red-path); }
            .green-path { fill: var(--green-path); }
            .yellow-path { fill: var(--yellow-path); }
            .blue-path { fill: var(--blue-path); }
            .center { fill: #FFFFFF; }
            .star { font-size: 0.8px; text-anchor: middle; dominant-baseline: central; fill: var(--path-stroke-color); }
        </style>
    </defs>

    <!-- Bases -->
    <rect x="0" y="0" width="6" height="6" class="red-base" />
    <rect x="0" y="9" width="6" height="6" class="green-base" />
    <rect x="9" y="9" width="6" height="6" class="yellow-base" />
    <rect x="9" y="0" width="6" height="6" class="blue-base" />
    
    <!-- Home Circles -->
    <circle cx="2" cy="2" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="4" cy="2" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="2" cy="4" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="4" cy="4" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />

    <circle cx="2" cy="11" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="4" cy="11" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="2" cy="13" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="4" cy="13" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />

    <circle cx="11" cy="11" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="13" cy="11" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="11" cy="13" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="13" cy="13" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    
    <circle cx="11" cy="2" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="13" cy="2" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="11" cy="4" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />
    <circle cx="13" cy="4" r="1.2" fill="white" stroke="#333" stroke-width="0.1" />

    <!-- Center Triangle -->
    <path d="M 6 6 L 7.5 7.5 L 6 9 Z" class="red-base" />
    <path d="M 6 9 L 7.5 7.5 L 9 9 Z" class="green-base" />
    <path d="M 9 9 L 7.5 7.5 L 9 6 Z" class="yellow-base" />
    <path d="M 9 6 L 7.5 7.5 L 6 6 Z" class="blue-base" />
    
    <!-- Path Grid -->
    <g stroke="var(--path-stroke-color)" stroke-width="0.05" fill="none">
        ${[...Array(15)].flatMap((_, r) => [...Array(15)].map((_, c) => {
            const pathSegments = [
                // Vertical Arms
                {c: 6, r: [0, 1, 2, 3, 4, 5]},
                {c: 8, r: [0, 1, 2, 3, 4, 5]},
                {c: 6, r: [9, 10, 11, 12, 13, 14]},
                {c: 8, r: [9, 10, 11, 12, 13, 14]},
                // Horizontal Arms
                {r: 6, c: [0, 1, 2, 3, 4, 5]},
                {r: 8, c: [0, 1, 2, 3, 4, 5]},
                {r: 6, c: [9, 10, 11, 12, 13, 14]},
                {r: 8, c: [9, 10, 11, 12, 13, 14]},
                // Center color lanes
                {c: 7, r: [1, 2, 3, 4, 5], color: 'var(--blue-base)'},
                {r: 7, c: [1, 2, 3, 4, 5], color: 'var(--red-base)'},
                {c: 7, r: [9, 10, 11, 12, 13], color: 'var(--green-base)'},
                {r: 7, c: [9, 10, 11, 12, 13], color: 'var(--yellow-base)'},
            ];

            for (const seg of pathSegments) {
                if (
                    (typeof seg.c === 'number' && seg.c === c && Array.isArray(seg.r) && seg.r.includes(r)) ||
                    (typeof seg.r === 'number' && seg.r === r && Array.isArray(seg.c) && seg.c.includes(c))
                ) {
                    return `<rect x="${c}" y="${r}" width="1" height="1" fill="${seg.color || 'var(--path-color)'}" />`;
                }
            }
            return '';
        }).join('')).join('')}
    </g>

    <!-- Start squares and other safe spots -->
    <rect x="1" y="6" width="1" height="1" fill="var(--red-base)" />
    <text x="1.5" y="6.5" class="star">★</text>
    <rect x="6" y="13" width="1" height="1" fill="var(--green-base)" />
    <text x="6.5" y="13.5" class="star">★</text>
    <rect x="13" y="8" width="1" height="1" fill="var(--yellow-base)" />
    <text x="13.5" y="8.5" class="star">★</text>
    <rect x="8" y="1" width="1" height="1" fill="var(--blue-base)" />
    <text x="8.5" y="1.5" class="star">★</text>

    <!-- Other Safe Spots -->
    <rect x="2" y="8" width="1" height="1" class="safe" />
    <text x="2.5" y="8.5" class="star">★</text>
    <rect x="6" y="2" width="1" height="1" class="safe" />
    <text x="6.5" y="2.5" class="star">★</text>
    <rect x="12" y="6" width="1" height="1" class="safe" />
    <text x="12.5" y="6.5" class="star">★</text>
    <rect x="8" y="12" width="1" height="1" class="safe" />
    <text x="8.5" y="12.5" class="star">★</text>
</svg>
`;