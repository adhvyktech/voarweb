import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Cube, Image as ImageIcon, Video, Maximize, Minimize, RotateCcw, Hand } from 'lucide-react';
import styles from '../styles/components/ARViewer.module.css';

interface ARElement {
  id: string;
  type: 'model' | 'image' | 'video' | 'text';
  name: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  content?: string;
}

interface ARViewerProps {
  elements: ARElement[];
  onElementUpdate: (id: string, updates: Partial<ARElement>) => void;
}

const ARViewer: React.FC<ARViewerProps> = ({ elements, onElementUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsRef = useRef<{ [key: string]: THREE.Object3D }>({});

  const [isARMode, setIsARMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ARElement | null>(null);
  const [isGrabbing, setIsGrabbing] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 3);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 5, 0);
    scene.add(directionalLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.update();
    controlsRef.current = controls;

    // AR button
    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body },
    });
    document.body.appendChild(arButton);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // AR session started handler
    renderer.xr.addEventListener('sessionstart', () => {
      setIsARMode(true);
    });

    // AR session ended handler
    renderer.xr.addEventListener('sessionend', () => {
      setIsARMode(false);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      document.body.removeChild(arButton);
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const loader = new GLTFLoader();

    // Remove old objects
    Object.values(objectsRef.current).forEach(obj => scene.remove(obj));
    objectsRef.current = {};

    // Add new objects
    elements.forEach(element => {
      if (element.type === 'model') {
        loader.load(element.url, (gltf) => {
          const model = gltf.scene;
          model.position.set(...element.position);
          model.rotation.set(...element.rotation);
          model.scale.set(...element.scale);
          scene.add(model);
          objectsRef.current[element.id] = model;
        });
      } else if (element.type === 'image' || element.type === 'video') {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = element.type === 'image'
          ? new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(element.url) })
          : new THREE.MeshBasicMaterial({ map: new THREE.VideoTexture(document.createElement('video')) });
        const plane = new THREE.Mesh(geometry, material);
        plane.position.set(...element.position);
        plane.rotation.set(...element.rotation);
        plane.scale.set(...element.scale);
        scene.add(plane);
        objectsRef.current[element.id] = plane;
      } else if (element.type === 'text') {
        const loader = new THREE.FontLoader();
        loader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
          const geometry = new THREE.TextGeometry(element.content || '', {
            font: font,
            size: 0.1,
            height: 0.01,
          });
          const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const textMesh = new THREE.Mesh(geometry, material);
          textMesh.position.set(...element.position);
          textMesh.rotation.set(...element.rotation);
          textMesh.scale.set(...element.scale);
          scene.add(textMesh);
          objectsRef.current[element.id] = textMesh;
        });
      }
    });
  }, [elements]);

  const handleElementUpdate = (id: string, updates: Partial<ARElement>) => {
    const object = objectsRef.current[id];
    if (object) {
      if (updates.position) object.position.set(...updates.position);
      if (updates.rotation) object.rotation.set(...updates.rotation);
      if (updates.scale) object.scale.set(...updates.scale);
    }
    onElementUpdate(id, updates);
  };

  const handleGrab = () => {
    setIsGrabbing(!isGrabbing);
    if (rendererRef.current) {
      rendererRef.current.domElement.style.cursor = isGrabbing ? 'grab' : 'grabbing';
    }
  };

  return (
    <div className={styles.arViewer} ref={containerRef}>
      <div className={styles.controls}>
        <Button onClick={() => setIsARMode(!isARMode)}>
          {isARMode ? <Minimize /> : <Maximize />}
          {isARMode ? 'Exit AR' : 'Enter AR'}
        </Button>
        <Button onClick={() => {
          if (cameraRef.current && controlsRef.current) {
            cameraRef.current.position.set(0, 1.6, 3);
            controlsRef.current.target.set(0, 1.6, 0);
            controlsRef.current.update();
          }
        }}>
          <RotateCcw />
          Reset View
        </Button>
        <Button onClick={handleGrab}>
          <Hand />
          {isGrabbing ? 'Release' : 'Grab'}
        </Button>
      </div>
      {selectedElement && (
        <Card className={styles.elementControls}>
          <CardHeader>
            <CardTitle>{selectedElement.name}</CardTitle>
            <CardDescription>{selectedElement.type}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.controlGroup}>
              <label>Position X</label>
              <Slider
                value={[selectedElement.position[0]]}
                min={-5}
                max={5}
                step={0.1}
                onValueChange={([value]) => handleElementUpdate(selectedElement.id, {
                  position: [value, selectedElement.position[1], selectedElement.position[2]]
                })}
              />
            </div>
            <div className={styles.controlGroup}>
              <label>Position Y</label>
              <Slider
                value={[selectedElement.position[1]]}
                min={-5}
                max={5}
                step={0.1}
                onValueChange={([value]) => handleElementUpdate(selectedElement.id, {
                  position: [selectedElement.position[0], value, selectedElement.position[2]]
                })}
              />
            </div>
            <div className={styles.controlGroup}>
              <label>Position Z</label>
              <Slider
                value={[selectedElement.position[2]]}
                min={-5}
                max={5}
                step={0.1}
                onValueChange={([value]) => handleElementUpdate(selectedElement.id, {
                  position: [selectedElement.position[0], selectedElement.position[1], value]
                })}
              />
            </div>
            <div className={styles.controlGroup}>
              <label>Scale</label>
              <Slider
                value={[selectedElement.scale[0]]}
                min={0.1}
                max={2}
                step={0.1}
                onValueChange={([value]) => handleElementUpdate(selectedElement.id, {
                  scale: [value, value, value]
                })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Switch
              checked={objectsRef.current[selectedElement.id]?.visible}
              onCheckedChange={(checked) => {
                if (objectsRef.current[selectedElement.id]) {
                  objectsRef.current[selectedElement.id].visible = checked;
                }
              }}
            />
            <span>Visible</span>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default ARViewer;