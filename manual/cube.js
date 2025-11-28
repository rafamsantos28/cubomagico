// ===============================================
// 1. Configuração da Cena e Variáveis Globais
// ===============================================

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Variáveis de Interação
let isDragging = false;
let startPoint = { x: 0, y: 0 };
let activeCubie = null;
let activeFaceNormal = null; // Normal da face clicada (importante para saber o eixo de rotação)

const cubeSize = 1; 
const gap = 0.05;   
const totalSize = cubeSize + gap;
const positions = [-1, 0, 1]; 

const cubies = [];

// ===============================================
// 2. Criação dos Cubies (Visual e Lógica)
// ===============================================

// Cores do cubo no sentido: +X, -X, +Y, -Y, +Z, -Z
const colors = [
    '#FF8800', // Laranja (+X)
    '#FF0000', // Vermelho (-X)
    '#FFFFFF', // Branco (+Y)
    '#FFFF00', // Amarelo (-Y)
    '#0000FF', // Azul (+Z)
    '#00AA00', // Verde (-Z)
];

function createCubieMaterial() {
    // Cria um material diferente para cada uma das 6 faces
    return colors.map(color => 
        new THREE.MeshBasicMaterial({ color: color })
    );
}

positions.forEach(x => {
    positions.forEach(y => {
        positions.forEach(z => {
            // Ignora o centro fixo (core)
            if (x === 0 && y === 0 && z === 0) return;

            const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
            const material = createCubieMaterial();
            const cubie = new THREE.Mesh(geometry, material);
            
            cubie.position.set(x * totalSize, y * totalSize, z * totalSize);
            
            // Armazena as coordenadas lógicas para rastreamento de rotação
            cubie.userData.coords = new THREE.Vector3(x, y, z); 
            
            scene.add(cubie);
            cubies.push(cubie);
        });
    });
});

// Adiciona uma luz ambiente
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// ===============================================
// 3. Câmera e Animação
// ===============================================

camera.position.set(5, 5, 5);
camera.lookAt(scene.position); 

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

animate();

// ===============================================
// 4. Lógica de Interação com Touchpad/Mouse
// ===============================================

// Mapeia coordenadas da tela para o formato 3D do Three.js
function onPointerDown(event) {
    // Calcula a posição do mouse/touchpad em coordenadas normalizadas (-1 a +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Atualiza o raio com a câmera e as coordenadas do mouse
    raycaster.setFromCamera(mouse, camera);

    // Encontra objetos que intersectam o raio
    const intersects = raycaster.intersectObjects(cubies);

    if (intersects.length > 0) {
        // Objeto mais próximo (o cubie clicado)
        const intersection = intersects[0];
        activeCubie = intersection.object;
        
        // A normal é crucial: ela diz qual face (e, portanto, qual fatia) foi clicada
        activeFaceNormal = intersection.face.normal.clone();
        activeCubie.updateWorldMatrix(true, false);
        activeFaceNormal.transformDirection(activeCubie.matrixWorld);

        // Inicia o arrasto
        startPoint = { x: event.clientX, y: event.clientY };
        isDragging = true;
        
        console.log(`Cubie clicado em: (${activeCubie.userData.coords.x}, ${activeCubie.userData.coords.y}, ${activeCubie.userData.coords.z})`);
    }
}

function onPointerUp(event) {
    if (!isDragging || !activeCubie) return;

    // Ponto final do arrasto
    const endPoint = { x: event.clientX, y: event.clientY };
    
    // Cálculo do deslocamento do touchpad
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    
    // Define um limite mínimo para considerar um movimento válido
    const threshold = 50; 
    
    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
        // Chama a função que determina e executa a rotação
        determineAndExecuteRotation(deltaX, deltaY);
    }

    // Reseta o estado
    isDragging = false;
    activeCubie = null;
    activeFaceNormal = null;
}

function determineAndExecuteRotation(deltaX, deltaY) {
    // ------------------------------------------------------------------
    // ESTA É A PARTE MAIS IMPORTANTE DA LÓGICA DO TOUCHPAD
    // Traduz o arrasto 2D (deltaX, deltaY) para uma rotação 3D (Eixo, Sentido)
    // ------------------------------------------------------------------
    
    // Exemplo: Se clicou na Face Superior (Y+):
    if (Math.abs(activeFaceNormal.y) > 0.9) { 
        // Se arrastou para a direita (deltaX > 0), gira a fatia U (Superior)
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            const direction = deltaX > 0 ? 1 : -1; // 1 = CW, -1 = CCW
            console.log(`Rotacionar Fatia Superior (U) ${direction > 0 ? 'Horário' : 'Anti-Horário'}`);
            // TODO: Chamar a função de animação e lógica da rotação em Y
        }
    } 
    // Exemplo: Se clicou na Face Frontal (Z+):
    else if (Math.abs(activeFaceNormal.z) > 0.9) {
        // Mover para cima/baixo (deltaY) deve girar as fatias Laterais (R/L)
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            const direction = deltaY > 0 ? 1 : -1; 
            console.log(`Rotacionar Fatia Direita/Esquerda (R/L) ${direction > 0 ? 'Anti-Horário' : 'Horário'}`);
            // TODO: Chamar a função de animação e lógica da rotação em X
        }
    }
    
    // A lógica completa envolve mapear R/L/U/D/F/B e seus sentidos para cada caso.
}

// Adiciona os event listeners
renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointerup', onPointerUp);
// Use 'pointermove' para capturar o arrasto do mouse ou toque
// (O 'pointermove' não é estritamente necessário se você só checa o ponto final em 'pointerup',
// mas é útil para dar feedback visual durante o arrasto)
// renderer.domElement.addEventListener('pointermove', onPointerMove);
