"use client";
import React, { useEffect, useRef } from 'react';

const vsSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    // Normal projection without Y-inversion
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const fsSource = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform vec3 u_keyColor;
  uniform float u_similarity;
  uniform float u_smoothness;
  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // Calculate Euclidean distance in RGB space (exactly how FFmpeg's 'colorkey' does it)
    float dist = distance(color.rgb, u_keyColor);
    
    // FFmpeg colorkey alpha blending:
    // alpha = (distance - similarity) / blend
    float alpha = 1.0;
    if (dist < u_similarity) {
      alpha = 0.0;
    } else if (u_smoothness > 0.0 && dist < u_similarity + u_smoothness) {
      alpha = (dist - u_similarity) / u_smoothness;
    }
    
    // Apply alpha without premultiplying color (to preview exact raw result)
    gl_FragColor = vec4(color.rgb, color.a * alpha);
  }
`;

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 1, b: 0 };
}

export default function ChromakeyPreview({
    videoSrc,
    color,
    tolerance,
    spill
}: {
    videoSrc: string;
    color: string;
    tolerance: number;
    spill: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const gl = canvas.getContext('webgl', { premultipliedAlpha: false });
        if (!gl) return;

        const compileShader = (type: number, source: string) => {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vertexShader = compileShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fsSource);
        if (!vertexShader || !fragmentShader) return;

        const program = gl.createProgram();
        if (!program) return;

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        // Quad geometry
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
        ]), gl.STATIC_DRAW);

        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0, 1.0, 1.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 1.0, 1.0, 0.0,
        ]), gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
        gl.enableVertexAttribArray(texCoordLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        const colorLoc = gl.getUniformLocation(program, "u_keyColor");
        const similarityLoc = gl.getUniformLocation(program, "u_similarity");
        const smoothnessLoc = gl.getUniformLocation(program, "u_smoothness");

        let animationFrame: number;

        const render = () => {
            if (video.readyState >= video.HAVE_CURRENT_DATA) {
                // Sync canvas size with true video dimenions
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }

                gl.viewport(0, 0, canvas.width, canvas.height);

                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

                const rgb = hexToRgb(color);
                gl.uniform3f(colorLoc, rgb.r, rgb.g, rgb.b);
                gl.uniform1f(similarityLoc, tolerance);
                gl.uniform1f(smoothnessLoc, spill);

                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
            animationFrame = requestAnimationFrame(render);
        };

        // start loop
        video.play().catch(e => console.error("Preview play err:", e));
        render();

        return () => {
            cancelAnimationFrame(animationFrame);
        };
    }, [videoSrc, color, tolerance, spill]);

    return (
        <div
            className="relative w-full aspect-video border-2 border-zinc-800 rounded-lg overflow-hidden"
            style={{
                backgroundImage: 'repeating-conic-gradient(#3f3f46 0% 25%, #18181b 0% 25% 50%)',
                backgroundSize: '32px 32px'
            }}
        >
            {/* Hidden source video */}
            <video
                ref={videoRef}
                src={videoSrc}
                loop
                muted
                playsInline
                className="hidden"
            />
            {/* Target Canvas output */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain"
            />
        </div>
    );
}
