// GLOBAL VARIABLES
let triggerAction = null;
let autoRotateComplete = false; 
let introDropComplete = false; // New flag for drop animation
let totalAutoRotation = 0;

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('#bottle-canvas');
    if (canvas) {
        // PERFORMANCE: Start 3D loading immediately with priority
        console.log('🚀 Starting high-priority 3D bottle loading...');
        initPerfectBottle(canvas);
    }
});

// PERFORMANCE: Preload 3D assets as soon as possible
const preload3DAssets = () => {
    const imageUrls = [
        './assets/bottle front.PNG',
        './assets/bottle back left.PNG', 
        './assets/bottle back right.PNG'
    ];
    
    console.log('⚡ Preloading 3D assets for instant rendering...');
    
    return Promise.all(imageUrls.map(url => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                console.log(`✅ Preloaded: ${url}`);
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`⚠️ Failed to preload: ${url}`);
                reject(new Error(`Failed to load ${url}`));
            };
            img.src = url;
        });
    }));
};

// Start preloading immediately
preload3DAssets().then(() => {
    console.log('🎯 All 3D assets preloaded successfully!');
}).catch(error => {
    console.log('⚠️ Some 3D assets failed to preload, will load normally');
});

function initPerfectBottle(canvas) {
    const container = canvas.parentElement;
    const loader = document.getElementById('loader');
    const washBtn = document.getElementById('wash-btn');

    // PERFORMANCE: Immediate loader feedback
    console.log('🎬 Initializing 3D bottle with instant feedback...');
    if (loader) {
        const loaderText = loader.querySelector('p');
        if (loaderText) {
            loaderText.textContent = 'Initializing 3D Engine...';
        }
    }

    // --- 1. SETUP SCENE ---
    const scene = new THREE.Scene();
    
    // MOBILE OPTIMIZATION - Adjust camera for smaller screens
    const isMobile = window.innerWidth <= 768;
    const cameraFOV = isMobile ? 35 : 28; // Wider FOV for mobile to show smaller bottle
    const cameraZ = isMobile ? 20 : 16; // Move camera back on mobile
    
    const camera = new THREE.PerspectiveCamera(cameraFOV, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = cameraZ;

    // ORIGINAL QUALITY: Renderer optimized for pixel-perfect clarity
    const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: false, // Disable antialiasing to preserve sharp pixels
        alpha: true,
        powerPreference: "high-performance",
        precision: "highp",
        preserveDrawingBuffer: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Use exact device pixel ratio
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.NoToneMapping; // No tone mapping for original colors
    renderer.shadowMap.enabled = false; // Disable shadows for cleaner rendering
    
    console.log('✅ 3D renderer initialized for ORIGINAL QUALITY (Pixel-Perfect)');

    // --- GROUPS ---
    const bottleGroup = new THREE.Group();
    scene.add(bottleGroup);
    
    // MOBILE OPTIMIZATION - Scale bottle smaller on mobile
    if (isMobile) {
        bottleGroup.scale.set(0.7, 0.7, 0.7); // Make bottle 70% size on mobile
    }
    
    // INITIAL DROP POSITION (Start High)
    bottleGroup.position.y = 30;

    const dogGroup = new THREE.Group();
    scene.add(dogGroup);
    dogGroup.position.set(0, -2, -10); // Start hidden
    dogGroup.visible = false;

    const liquidGroup = new THREE.Group();
    scene.add(liquidGroup);

    // EMITTER: Invisible point at cap
    const capEmitter = new THREE.Object3D();
    capEmitter.position.set(0, 3.4, 0);
    bottleGroup.add(capEmitter);

    // --- 2. BOTTLE CONFIGURATION ---
    const imageData = [
        { path: './assets/bottle front.PNG', rotation: 0, name: 'Front', isMirrored: false },
        { path: './assets/bottle back left.PNG', rotation: Math.PI * 2/3, name: 'Back Left', isMirrored: true },
        { path: './assets/bottle back right.PNG', rotation: Math.PI * 4/3, name: 'Back Right', isMirrored: true }
    ];

    const bottlePlanes = [];

    const processImageStrict = (image, targetWidth, targetHeight) => {
        // ORIGINAL HD QUALITY: Use exact original image without any processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use original image dimensions for maximum clarity
        canvas.width = image.width;
        canvas.height = image.height;

        // MAXIMUM CLARITY: No smoothing or filtering - direct copy
        ctx.imageSmoothingEnabled = false; // Preserve pixel-perfect clarity
        
        // Draw image at original size with no scaling or processing
        ctx.drawImage(image, 0, 0, image.width, image.height);

        // MINIMAL TRANSPARENCY PROCESSING: Only remove pure white backgrounds
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const data = imageData.data;

        // Very conservative transparency - only remove obvious white backgrounds
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            // Only remove pure white pixels (255,255,255) to preserve all bottle details
            if (r >= 254 && g >= 254 && b >= 254) {
                data[i + 3] = 0; // Make transparent
            }
        }

        ctx.putImageData(imageData, 0, 0);
        console.log(`🎨 ORIGINAL QUALITY preserved: ${image.width}x${image.height} (Pixel-Perfect)`);
        return canvas;
    };

    // ORIGINAL QUALITY: Use actual image dimensions without any resizing
    const frontImg = new Image();
    frontImg.crossOrigin = 'anonymous';
    let masterWidth = 0; // Will be set to actual image width
    let masterHeight = 0; // Will be set to actual image height

    // PERFORMANCE: Update loader immediately when starting
    if (loader) {
        const loaderText = loader.querySelector('p');
        if (loaderText) {
            loaderText.textContent = 'Loading HD Bottle Images...';
        }
    }

    // PERFORMANCE: Instant loading with cached images
    const loadWithCache = (imageSrc) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            // Check if image is already cached
            img.onload = () => {
                console.log(`⚡ Loaded (${img.complete ? 'cached' : 'network'}): ${imageSrc}`);
                resolve(img);
            };
            img.onerror = reject;
            img.src = imageSrc;
        });
    };

    frontImg.onload = () => {
        masterWidth = frontImg.width;
        masterHeight = frontImg.height;
        
        console.log(`✅ ORIGINAL QUALITY Master image loaded: ${masterWidth}x${masterHeight} (Pixel-Perfect Quality)`);
        
        // PERFORMANCE: Update loader progress
        if (loader) {
            const loaderText = loader.querySelector('p');
            if (loaderText) {
                loaderText.textContent = 'Loading Original Quality Textures...';
            }
        }
        
        // PERFORMANCE: Start immediate parallel loading
        Promise.all([
            loadWithCache('./assets/bottle front.PNG'),
            loadWithCache('./assets/bottle back left.PNG'),
            loadWithCache('./assets/bottle back right.PNG')
        ]).then((images) => {
            console.log('🚀 All images loaded - starting 3D processing...');
            loadAllBottles();
        }).catch(error => {
            console.warn('Some images failed, loading individually:', error);
            loadAllBottles();
        });
        
        createDogAssets();
    };
    
    frontImg.src = './assets/bottle front.PNG';

    const loadAllBottles = () => {
        let loadedCount = 0;
        
        // PERFORMANCE: Instant progress feedback
        const updateProgress = (count, total) => {
            const loader = document.getElementById('loader');
            const loaderText = loader?.querySelector('p');
            if (loaderText) {
                loaderText.textContent = `Rendering 3D Bottle... ${count}/${total}`;
            }
            console.log(`📊 Progress: ${count}/${total} textures processed`);
        };
        
        // PERFORMANCE: Hide loader after first successful load for instant feedback
        const hideLoaderFast = () => {
            console.log('🎉 3D Bottle Ready! Hiding loader instantly...');
            if (loader) {
                loader.style.opacity = '0';
                loader.style.transition = 'opacity 0.1s ease-out';
                setTimeout(() => {
                    loader.style.display = 'none';
                    console.log('✅ Loader hidden - 3D experience active!');
                }, 100); // Ultra-fast transition
            }
        };
        
        imageData.forEach((data, index) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                console.log(`🎨 Processing texture ${index + 1}/3: ${data.name}`);
                
                // ORIGINAL QUALITY: Use image exactly as it is - no processing
                const processedCanvas = processImageStrict(img, img.width, img.height);
                const texture = new THREE.CanvasTexture(processedCanvas);
                texture.encoding = THREE.sRGBEncoding;
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.NearestFilter; // Pixel-perfect filtering
                texture.magFilter = THREE.NearestFilter; // No blurring on magnification
                texture.generateMipmaps = false; // Disable mipmaps to preserve original quality
                texture.flipY = true;
                texture.format = THREE.RGBAFormat;
                texture.type = THREE.UnsignedByteType;

                if (data.isMirrored) {
                    texture.center.set(0.5, 0.5);
                    texture.repeat.set(-1, 1);
                }

                const aspect = img.width / img.height; // Use actual image aspect ratio
                const planeHeight = 10;
                const planeWidth = planeHeight * aspect;

                const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight); // Simple geometry for clarity
                const material = new THREE.MeshBasicMaterial({ // Use basic material for pixel-perfect rendering
                    map: texture,
                    transparent: true,
                    alphaTest: 0.01,
                    side: THREE.DoubleSide
                });

                const plane = new THREE.Mesh(geometry, material);
                plane.rotation.y = data.rotation;
                plane.userData = { originalRotation: data.rotation };

                bottlePlanes.push(plane);
                bottleGroup.add(plane);

                loadedCount++;
                updateProgress(loadedCount, 3);
                
                // PERFORMANCE: Hide loader after first texture for instant feedback
                if (loadedCount === 1) {
                    hideLoaderFast();
                    updateVisibility();
                }
                
                // Complete setup when all textures are ready
                if (loadedCount === 3) {
                    console.log('🏆 All 3 ORIGINAL QUALITY textures loaded - Pixel-perfect 3D bottle ready!');
                    updateVisibility();
                }
            };
            
            // PERFORMANCE: Handle errors gracefully without blocking
            img.onerror = () => {
                console.error(`❌ Failed to load texture ${index + 1}: ${data.path}`);
                loadedCount++;
                updateProgress(loadedCount, 3);
                
                // Hide loader even with errors to prevent infinite loading
                if (loadedCount === 1) {
                    hideLoaderFast();
                }
                
                if (loadedCount === 3) {
                    console.log('⚠️ Loading complete with some failures');
                    updateVisibility();
                }
            };
            
            img.src = data.path;
        });
    };

    const updateVisibility = () => {
        if (bottlePlanes.length === 0) return;

        const currentRot = ((bottleGroup.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

        bottlePlanes.forEach((plane) => {
            let dist = Math.abs(currentRot - plane.userData.originalRotation);
            if (dist > Math.PI) dist = Math.PI * 2 - dist;

            if (dist < Math.PI / 3) {
                plane.visible = true;
                plane.material.opacity = 1;
            } else {
                plane.visible = false;
            }
        });
    };

    // --- 5. DOG/CAT ASSETS ---
    let dirtyDogMesh, cleanDogMesh;

    const createDogAssets = () => {
        const geo = new THREE.PlaneGeometry(6.5, 3.8);
        const textureLoader = new THREE.TextureLoader();

        // 1. CLEAN CAT (Bottom Layer)
        const cleanTex = textureLoader.load('./assets/dog_clean.PNG');
        cleanTex.encoding = THREE.sRGBEncoding;
        cleanTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

        const cleanMat = new THREE.MeshBasicMaterial({
            map: cleanTex,
            transparent: true,
            side: THREE.DoubleSide,
            toneMapped: false
        });

        cleanDogMesh = new THREE.Mesh(geo, cleanMat);
        dogGroup.add(cleanDogMesh);

        // 2. DIRTY CAT (Top Layer)
        const dirtyTex = textureLoader.load('./assets/dog_dirty.PNG');
        dirtyTex.encoding = THREE.sRGBEncoding;
        dirtyTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

        const dirtyMat = new THREE.MeshBasicMaterial({
            map: dirtyTex,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide,
            toneMapped: false
        });

        dirtyDogMesh = new THREE.Mesh(geo, dirtyMat);
        dirtyDogMesh.position.z = 0.05;
        dogGroup.add(dirtyDogMesh);
    };

    // --- 6. FOAM PARTICLES SYSTEM ---
    const foamGeo = new THREE.SphereGeometry(1, 6, 6);
    const foamMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        transparent: true,
        opacity: 0.95
    });

    let fallingParticles = [];
    let foamBubbles = [];

    const spawnFallingFoam = () => {
        // INCREASED DENSITY
        for(let i=0; i<10; i++) {
            const p = new THREE.Mesh(foamGeo, foamMat);
            const pos = new THREE.Vector3();
            capEmitter.getWorldPosition(pos);
            p.position.copy(pos);

            const s = 0.08 + Math.random() * 0.12;
            p.scale.set(s,s,s);

            p.position.x += (Math.random()-0.5) * 0.3;
            p.position.z += (Math.random()-0.5) * 0.3;

            p.userData = {
                vx: (Math.random()) * 0.02,
                vy: 0,
                vz: (Math.random()-0.5) * 0.02,
                type: 'falling'
            };

            liquidGroup.add(p);
            fallingParticles.push(p);
        }
    };

    const spawnStickFoam = (x, y, z) => {
        for(let k=0; k<3; k++) {
            const b = new THREE.Mesh(foamGeo, foamMat);
            b.position.set(
                x + (Math.random()-0.5) * 1.5,
                y + (Math.random()-0.5) * 0.5,
                z + 0.2
            );

            const s = 0.01;
            b.scale.set(s,s,s);

            b.userData = {
                type: 'static',
                maxScale: 0.1 + Math.random() * 0.15,
                life: 200,
                slideSpeed: 0.002 + Math.random() * 0.005
            };

            liquidGroup.add(b);
            foamBubbles.push(b);
        }
    };

    const updateParticles = () => {
        // 1. Update Falling Particles
        for (let i = fallingParticles.length - 1; i >= 0; i--) {
            const p = fallingParticles[i];
            p.userData.vy -= 0.015;
            p.position.x += p.userData.vx;
            p.position.y += p.userData.vy;
            p.position.z += p.userData.vz;

            if (p.position.y < -0.5 && p.position.y > -3.0 && p.position.x > -2.0 && p.position.x < 3.0) {
                spawnStickFoam(p.position.x, p.position.y, p.position.z);
                liquidGroup.remove(p);
                fallingParticles.splice(i, 1);
                continue;
            }

            if (p.position.y < -8) {
                liquidGroup.remove(p);
                fallingParticles.splice(i, 1);
            }
        }

        // 2. Update Static/Sliding Foam
        for (let i = foamBubbles.length - 1; i >= 0; i--) {
            const b = foamBubbles[i];

            if (animationState === 'washing_foam_clear') {
                b.userData.slideSpeed *= 1.1;
                b.userData.life -= 5;
            }

            if (b.scale.x < b.userData.maxScale) {
                b.scale.multiplyScalar(1.1);
            }

            if (b.userData.life < 150 || animationState === 'washing_foam_clear') {
                b.position.y -= b.userData.slideSpeed;
                b.userData.slideSpeed *= 1.02;
            }

            b.userData.life--;

            if (b.userData.life < 0) {
                b.scale.multiplyScalar(0.9);
                if (b.scale.x < 0.01) {
                    liquidGroup.remove(b);
                    foamBubbles.splice(i, 1);
                }
            }
        }
    };

    // --- 7. ANIMATION STATE MACHINE ---
    let animationState = 'idle';
    let animTimer = 0;

    triggerAction = (action) => {
        if (animationState !== 'idle') return;

        if (action === 'wash') {
            animationState = 'washing_enter';
            washBtn.disabled = true;
        }
        animTimer = 0;
    };

    const runAnimationLogic = () => {
        animTimer++;

        if (animationState.startsWith('washing')) {
            // 1. Enter
            if (animationState === 'washing_enter') {
                dogGroup.visible = true;
                bottleGroup.position.x = THREE.MathUtils.lerp(bottleGroup.position.x, -2.5, 0.05);

                let cy = bottleGroup.rotation.y % (Math.PI*2);
                if(cy > Math.PI) cy -= Math.PI*2;
                bottleGroup.rotation.y = THREE.MathUtils.lerp(bottleGroup.rotation.y, 0, 0.1);

                dogGroup.position.z = THREE.MathUtils.lerp(dogGroup.position.z, -1.0, 0.03);
                dogGroup.position.x = THREE.MathUtils.lerp(dogGroup.position.x, 0.5, 0.03);

                const walkSpeed = Date.now() * 0.012;
                dogGroup.position.y = -2.2 + Math.abs(Math.sin(walkSpeed)) * 0.3;
                dogGroup.rotation.z = Math.cos(walkSpeed) * 0.05;

                if (Math.abs(bottleGroup.position.x + 2.5) < 0.1 && dogGroup.position.z > -1.2) {
                    animationState = 'washing_tilt';
                    dogGroup.position.y = -2.2;
                    dogGroup.rotation.z = 0;
                }
            }
            // 2. Tilt
            else if (animationState === 'washing_tilt') {
                bottleGroup.rotation.z = THREE.MathUtils.lerp(bottleGroup.rotation.z, -1.3, 0.05);

                if (Math.abs(bottleGroup.rotation.z + 1.3) < 0.05) {
                    animationState = 'washing_active';
                    animTimer = 0;
                }
            }
            // 3. Wash (SMOOTH TRANSITION & SHORTER TIMING)
            else if (animationState === 'washing_active') {
                spawnFallingFoam();

                if (animTimer > 20 && dirtyDogMesh.material.opacity > 0) {
                    dirtyDogMesh.material.opacity -= 0.015;
                }

                if (animTimer > 120) {
                    animationState = 'washing_foam_clear';
                    animTimer = 0;
                }
            }
            // 4. Foam Clear
            else if (animationState === 'washing_foam_clear') {
                bottleGroup.rotation.z = THREE.MathUtils.lerp(bottleGroup.rotation.z, 0, 0.05);

                if (foamBubbles.length === 0 || animTimer > 150) {
                    animationState = 'washing_exit';
                }
            }
            // 5. Exit
            else if (animationState === 'washing_exit') {
                bottleGroup.position.x = THREE.MathUtils.lerp(bottleGroup.position.x, 0, 0.05);
                dogGroup.position.z = THREE.MathUtils.lerp(dogGroup.position.z, -12, 0.03);

                const walkSpeed = Date.now() * 0.012;
                dogGroup.position.y = -2.2 + Math.abs(Math.sin(walkSpeed)) * 0.3;
                dogGroup.rotation.z = Math.cos(walkSpeed) * 0.05;

                if (Math.abs(bottleGroup.position.x) < 0.1 && dogGroup.position.z < -10) {
                    dogGroup.visible = false;
                    dirtyDogMesh.material.opacity = 1; // Reset for next time
                    animationState = 'idle';
                    washBtn.disabled = false;
                }
            }
        }

        updateVisibility();
    };

    // --- 8. LIGHTING ---
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(10, 10, 20);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-10, 5, 10);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // --- 9. PHYSICS CONTROLS - MOBILE OPTIMIZED ---
    let isDragging = false;
    let prevX = 0;
    let velocity = 0;
    const friction = 0.95;

    const onDown = (x) => {
        if(animationState !== 'idle') return;
        isDragging = true;
        canvas.style.cursor = 'grabbing';
        prevX = x;
        velocity = 0;
    };

    const onMove = (x) => {
        if (!isDragging) return;
        const delta = x - prevX;
        velocity = delta * 0.005;
        bottleGroup.rotation.y += velocity;
        updateVisibility();
        prevX = x;
    };

    const onUp = () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    };

    // Mouse events
    canvas.addEventListener('mousedown', e => onDown(e.clientX));
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', e => onMove(e.clientX));

    // Touch events - optimized for mobile scrolling
    canvas.addEventListener('touchstart', e => {
        // Only prevent default if we're actually interacting with the bottle
        if (e.touches.length === 1) {
            onDown(e.touches[0].clientX);
            e.preventDefault(); // Prevent scrolling only when touching bottle
        }
    }, {passive: false});
    
    window.addEventListener('touchend', onUp);
    
    canvas.addEventListener('touchmove', e => {
        if (isDragging && e.touches.length === 1) {
            onMove(e.touches[0].clientX);
            e.preventDefault(); // Prevent scrolling only when dragging bottle
        }
    }, {passive: false});

    // --- 10. ANIMATION LOOP ---
    function animate() {
        requestAnimationFrame(animate);

        updateParticles();

        if (animationState !== 'idle') {
            runAnimationLogic();
        } else {
            // --- IDLE STATE LOGIC (UPDATED) ---
            // 1. DROP IN ANIMATION
            if (!introDropComplete) {
                // Smoothly lerp Y from 30 down to 0
                bottleGroup.position.y = THREE.MathUtils.lerp(bottleGroup.position.y, 0, 0.08);
                if (bottleGroup.position.y < 0.05) {
                    bottleGroup.position.y = 0;
                    introDropComplete = true; // Drop finished, trigger rotate
                }
            }
            // 2. AUTO-ROTATE (FAST ZIP)
            else if (!autoRotateComplete) {
                const speed = 0.5; // VERY FAST
                bottleGroup.rotation.y += speed;
                totalAutoRotation += speed;

                if (totalAutoRotation >= Math.PI * 2) {
                    autoRotateComplete = true; // Ensure it stops perfectly
                    // Optional: bottleGroup.rotation.y = 0;
                }

                updateVisibility();

                // Breathing effect during spin
                bottleGroup.position.y = Math.sin(Date.now() * 0.001) * 0.05;
            }
            // 3. MANUAL CONTROL (STICK)
            else if (!isDragging) {
                velocity *= friction;
                bottleGroup.rotation.y += velocity;
                if (Math.abs(velocity) > 0.0001) updateVisibility();

                // Breathing effect always active
                bottleGroup.position.y = Math.sin(Date.now() * 0.001) * 0.05;
            }
        }

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        
        // MOBILE OPTIMIZATION - Adjust camera on resize
        const isMobile = window.innerWidth <= 768;
        camera.fov = isMobile ? 35 : 28;
        camera.position.z = isMobile ? 20 : 16;
        
        // Update bottle scale for mobile
        if (isMobile) {
            bottleGroup.scale.set(0.7, 0.7, 0.7);
        } else {
            bottleGroup.scale.set(1, 1, 1);
        }
        
        camera.updateProjectionMatrix();
    });
} // Close initPerfectBottle function