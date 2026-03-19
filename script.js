document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('sourceVideo');
    const canvas = document.getElementById('edgeCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const playBtn = document.getElementById('playBtn');
    const fpsDisplay = document.getElementById('fps');
    const thresholdInput = document.getElementById('threshold');
    
    let isPlaying = false;
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId = null;

    // Sobel Kernels
    const Kx = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1],
    ];
    const Ky = [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1],
    ];

    const hiddenCanvas = document.createElement('canvas');
    const hctx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
    
    function applyEdgeDetection() {
        if (video.paused || video.ended) return;

        // Ensure canvas dimensions match video
        if (canvas.width !== video.offsetWidth || canvas.height !== video.offsetHeight) {
            canvas.width = video.offsetWidth;
            canvas.height = video.offsetHeight;
        }

        const width = canvas.width;
        const height = canvas.height;

        // For performance, we'll process at a lower resolution and scale up for display
        const procWidth = Math.min(width, 480);
        const procHeight = Math.floor(procWidth * (height / width));

        if (hiddenCanvas.width !== procWidth || hiddenCanvas.height !== procHeight) {
            hiddenCanvas.width = procWidth;
            hiddenCanvas.height = procHeight;
        }

        // Draw current video frame to hidden canvas (resized)
        hctx.drawImage(video, 0, 0, procWidth, procHeight);

        // Get image data from hidden canvas
        const imageData = hctx.getImageData(0, 0, procWidth, procHeight);
        const data = imageData.data;
        const output = hctx.createImageData(procWidth, procHeight);
        const outData = output.data;
        const threshold = parseInt(thresholdInput.value, 10);

        // Optimized Sobel loop
        for (let y = 1; y < procHeight - 1; y++) {
            for (let x = 1; x < procWidth - 1; x++) {
                const idx = (y * procWidth + x) * 4;
                
                // Sobel approximation: Simplified
                const i_top = ((y-1)*procWidth + x)*4;
                const i_bot = ((y+1)*procWidth + x)*4;
                const i_left = (y*procWidth + (x-1))*4;
                const i_right = (y*procWidth + (x+1))*4;

                const gx = (data[i_right] + data[i_right+1] + data[i_right+2]) - 
                           (data[i_left] + data[i_left+1] + data[i_left+2]);
                const gy = (data[i_bot] + data[i_bot+1] + data[i_bot+2]) - 
                           (data[i_top] + data[i_top+1] + data[i_top+2]);

                const mag = Math.abs(gx) + Math.abs(gy);

                if (mag > threshold) {
                    outData[idx] = 0;           // R (Neon Cyan)
                    outData[idx + 1] = 240;     // G
                    outData[idx + 2] = 255;     // B
                    outData[idx + 3] = 255;     // A
                } else {
                    outData[idx] = 0;
                    outData[idx + 1] = 0;
                    outData[idx + 2] = 0;
                    outData[idx + 3] = 255;
                }
            }
        }

        hctx.putImageData(output, 0, 0);

        // Scale processed data back to display canvas
        ctx.clearRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = false; // Keep edges sharp
        ctx.drawImage(hiddenCanvas, 0, 0, width, height);

        // FPS counter
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
            fpsDisplay.textContent = Math.round((frameCount * 1000) / (now - lastTime));
            frameCount = 0;
            lastTime = now;
        }

        animationId = requestAnimationFrame(applyEdgeDetection);
    }

    playBtn.addEventListener('click', () => {
        if (video.paused) {
            video.play();
            playBtn.style.opacity = '0';
            playBtn.style.pointerEvents = 'none';
            applyEdgeDetection();
        }
    });

    video.addEventListener('play', () => {
        isPlaying = true;
        if (!animationId) applyEdgeDetection();
    });

    video.addEventListener('pause', () => {
        isPlaying = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    });

    // Handle video ending
    video.addEventListener('ended', () => {
        playBtn.style.opacity = '1';
        playBtn.style.pointerEvents = 'auto';
    });
});
