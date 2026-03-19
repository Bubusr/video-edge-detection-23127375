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
    
    /**
     * Thuật toán Edge Detection (Sobel Operator) tự triển khai
     * Không sử dụng bất kỳ thư viện bên ngoài nào (OpenCV, v.v.)
     * 
     * Nguyên lý:
     * 1. Duyệt qua từng pixel của frame video
     * 2. Áp dụng ma trận Kernel 3x3 (Sobel) để tính đạo hàm theo trục X và Y
     * 3. Tính độ lớn gradient để tìm biên cạnh
     */
    function applyEdgeDetection() {
        if (video.paused || video.ended) return;

        // Đảm bảo kích thước canvas khớp với video thực tế
        if (canvas.width !== video.offsetWidth || canvas.height !== video.offsetHeight) {
            canvas.width = video.offsetWidth;
            canvas.height = video.offsetHeight;
        }

        const width = canvas.width;
        const height = canvas.height;

        // Tối ưu hiệu suất: Xử lý ở độ phân giải thấp hơn (max 640px rộng) 
        // sau đó scale lên để hiển thị nhằm đảm bảo đạt 30-60 FPS
        const procWidth = Math.min(width, 640);
        const procHeight = Math.floor(procWidth * (height / width));

        if (hiddenCanvas.width !== procWidth || hiddenCanvas.height !== procHeight) {
            hiddenCanvas.width = procWidth;
            hiddenCanvas.height = procHeight;
        }

        // Bước 1: Trích xuất frame từ video lên hidden canvas
        hctx.drawImage(video, 0, 0, procWidth, procHeight);

        // Bước 2: Lấy dữ liệu pixel thô (Raw Image Data)
        const imageData = hctx.getImageData(0, 0, procWidth, procHeight);
        const data = imageData.data;
        const output = hctx.createImageData(procWidth, procHeight);
        const outData = output.data;
        const threshold = parseInt(thresholdInput.value, 10);

        // Bước 3: Thuật toán Sobel lặp qua từng pixel (bỏ qua biên ngoài cùng)
        for (let y = 1; y < procHeight - 1; y++) {
            for (let x = 1; x < procWidth - 1; x++) {
                let pixelX = 0;
                let pixelY = 0;

                // Ma trận Sobel 3x3:
                // Kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
                // Ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
                
                // Hàng -1
                for (let ky = -1; ky <= 1; ky++) {
                    const rowOffset = (y + ky) * procWidth;
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = (rowOffset + (x + kx)) * 4;
                        
                        // Chuyển sang Grayscale (độ sáng trung bình) để xử lý
                        const gray = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                        
                        // Áp dụng trọng số Kernel Sobel trực tiếp (đã tối ưu hóa)
                        // Ma trận X: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
                        // Ma trận Y: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
                        pixelX += gray * Kx[ky + 1][kx + 1];
                        pixelY += gray * Ky[ky + 1][kx + 1];
                    }
                }

                // Tính độ lớn Gradient (Pitago)
                const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
                const idx = (y * procWidth + x) * 4;

                // Bước 4: Phân ngưỡng (Thresholding) để hiển thị biên cạnh
                if (magnitude > threshold) {
                    outData[idx]     = 0;   // Neon R
                    outData[idx + 1] = 240; // Neon G
                    outData[idx + 2] = 255; // Neon B
                    outData[idx + 3] = 255; // Alpha
                } else {
                    outData[idx]     = 0;
                    outData[idx + 1] = 0;
                    outData[idx + 2] = 0;
                    outData[idx + 3] = 255;
                }
            }
        }

        // Bước 5: Đổ ngược dữ liệu đã xử lý lên canvas
        hctx.putImageData(output, 0, 0);

        // Vẽ kết quả từ hidden canvas lên màn hình chính (scaled)
        ctx.drawImage(hiddenCanvas, 0, 0, width, height);

        // Cập nhật FPS counter
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
