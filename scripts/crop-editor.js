// Image Crop Editor State
let cropState = {
    image: null,
    canvas: null,
    ctx: null,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    targetType: null, // 'background' or 'avatar'
    originalWidth: 0,
    originalHeight: 0
};

function initImageCropEditor() {
    const canvas = document.getElementById('crop-canvas');
    const ctx = canvas.getContext('2d');
    const zoomSlider = document.getElementById('crop-zoom');
    const acceptBtn = document.getElementById('crop-accept');
    const cancelBtn = document.getElementById('crop-cancel');

    cropState.canvas = canvas;
    cropState.ctx = ctx;

    // Zoom control
    zoomSlider?.addEventListener('input', () => {
        cropState.scale = zoomSlider.value / 100;
        drawCroppedImage();
    });

    // Mouse drag controls
    canvas?.addEventListener('mousedown', (e) => {
        cropState.isDragging = true;
        cropState.lastX = e.offsetX;
        cropState.lastY = e.offsetY;
    });

    canvas?.addEventListener('mousemove', (e) => {
        if (!cropState.isDragging) return;

        const dx = e.offsetX - cropState.lastX;
        const dy = e.offsetY - cropState.lastY;

        cropState.offsetX += dx;
        cropState.offsetY += dy;

        cropState.lastX = e.offsetX;
        cropState.lastY = e.offsetY;

        drawCroppedImage();
    });

    canvas?.addEventListener('mouseup', () => {
        cropState.isDragging = false;
    });

    canvas?.addEventListener('mouseleave', () => {
        cropState.isDragging = false;
    });

    // Accept cropped image
    acceptBtn?.addEventListener('click', () => {
        const croppedDataURL = canvas.toDataURL('image/png');

        if (cropState.targetType === 'background') {
            PROFILE_DATA.background = croppedDataURL;
        } else if (cropState.targetType === 'avatar') {
            PROFILE_DATA.avatar = croppedDataURL;
        }

        // Update display and save immediately
        updateProfileDisplay();
        saveProfileData();

        closeCropModal();
    });

    // Cancel
    cancelBtn?.addEventListener('click', closeCropModal);
}

function openCropModal(imageFile, targetType) {
    const modal = document.getElementById('crop-modal');
    const reader = new FileReader();

    cropState.targetType = targetType;

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            cropState.image = img;
            cropState.originalWidth = img.width;
            cropState.originalHeight = img.height;
            cropState.scale = 0.8; // Start at 80% zoom
            cropState.offsetX = 0;
            cropState.offsetY = 0;

            // Set canvas size based on target
            if (targetType === 'background') {
                cropState.canvas.width = 800;
                cropState.canvas.height = 300;
            } else {
                cropState.canvas.width = 400;
                cropState.canvas.height = 400;
            }

            drawCroppedImage();
            modal.classList.add('active');
            document.getElementById('crop-zoom').value = 80; // Set slider to 80%
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(imageFile);
}

function closeCropModal() {
    const modal = document.getElementById('crop-modal');
    modal.classList.remove('active');
    cropState.image = null;
}

function drawCroppedImage() {
    if (!cropState.image || !cropState.ctx) return;

    const canvas = cropState.canvas;
    const ctx = cropState.ctx;
    const img = cropState.image;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scaled dimensions
    const scaledWidth = img.width * cropState.scale;
    const scaledHeight = img.height * cropState.scale;

    // Center image initially
    const x = (canvas.width - scaledWidth) / 2 + cropState.offsetX;
    const y = (canvas.height - scaledHeight) / 2 + cropState.offsetY;

    // Draw image
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
}

function initFileUploads() {
    const bgFileInput = document.getElementById('editor-bg-file');
    const avatarFileInput = document.getElementById('editor-avatar-file');

    bgFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            openCropModal(file, 'background');
        }
        e.target.value = ''; // Reset input
    });

    avatarFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            openCropModal(file, 'avatar');
        }
        e.target.value = ''; // Reset input
    });
}
