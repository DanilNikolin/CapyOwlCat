export function getTransformMatrix(
    w: number, h: number,
    x0: number, y0: number, // top-left
    x1: number, y1: number, // top-right
    x2: number, y2: number, // bottom-right
    x3: number, y3: number  // bottom-left
): number[] {
    // Mapping square (0,0)->(1,0)->(1,1)->(0,1) to target points
    const dx1 = x1 - x2;
    const dy1 = y1 - y2;
    const dx2 = x3 - x2;
    const dy2 = y3 - y2;
    const dx3 = x0 - x1 + x2 - x3;
    const dy3 = y0 - y1 + y2 - y3;

    let m11, m12, m13, m21, m22, m23, m31, m32, m33;

    if (dx3 === 0 && dy3 === 0) {
        m11 = x1 - x0;
        m21 = x2 - x1;
        m31 = x0;
        m12 = y1 - y0;
        m22 = y2 - y1;
        m32 = y0;
        m13 = 0;
        m23 = 0;
        m33 = 1;
    } else {
        const det = dx1 * dy2 - dy1 * dx2;
        if (det === 0) return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

        m13 = (dx3 * dy2 - dy3 * dx2) / det;
        m23 = (dx1 * dy3 - dy1 * dx3) / det;

        m11 = x1 - x0 + m13 * x1;
        m21 = x3 - x0 + m23 * x3;
        m31 = x0;

        m12 = y1 - y0 + m13 * y1;
        m22 = y3 - y0 + m23 * y3;
        m32 = y0;
        m33 = 1;
    }

    // Scale down input side from [0..w, 0..h] to [0..1, 0..1]
    m11 /= w;
    m12 /= w;
    m13 /= w;

    m21 /= h;
    m22 /= h;
    m23 /= h;

    // CSS matrix3d array (column-major)
    return [
        m11, m12, 0, m13,
        m21, m22, 0, m23,
        0, 0, 1, 0,
        m31, m32, 0, m33
    ];
}
