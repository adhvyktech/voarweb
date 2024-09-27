import React, { useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import styles from '../styles/components/ARViewer.module.css';
import { useAREngine } from '../hooks/useAREngine';
import { useTracking } from '../hooks/useTracking';

interface ModelProps {
  url: string;
  elementId: string;
}

const Model: React.FC<ModelProps> = ({ url, elementId }) => {
  const { scene } = useGLTF(url);
  const { updateElement } = useAREngine();
  const { camera } = useThree();
  const modelRef = useRef<THREE.Group>();

  useEffect(() => {
    if (modelRef.current) {
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

      cameraZ *= 1.5; // Zoom out a little so object fits in view

      camera.position.set(center.x, center.y, center.z + cameraZ);
      camera.lookAt(center);
      camera.updateProjectionMatrix();

      updateElement(elementId, {
        position: center,
        scale: new THREE.Vector3(1, 1, 1),
      });
    }
  }, [camera, elementId, updateElement]);

  return <primitive object={scene} ref={modelRef} />;
};

const Scene: React.FC = () => {
  const { setSceneRef, elements } = useAREngine();
  const { scene } = useThree();

  useEffect(() => {
    setSceneRef(scene);
  }, [scene, setSceneRef]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />
      {elements.map((element) => (
        <Model key={element.id} url={element.object.userData.url} elementId={element.id} />
      ))}
      <OrbitControls />
    </>
  );
};

const ARViewer: React.FC = () => {
  const { addElement, elements } = useAREngine();
  const [selectedModel, setSelectedModel] = useState<string>('/assets/models/robot.glb');
  const [trackingType, setTrackingType] = useState<'image' | 'face' | 'pose'>('image');
  const { isTracking, result, videoRef, startTracking, stopTracking } = useTracking(trackingType);

  const models = [
    { value: '/assets/models/robot.glb', label: 'Robot' },
    { value: '/assets/models/car.glb', label: 'Car' },
    { value: '/assets/models/house.glb', label: 'House' },
  ];

  const handleAddModel = () => {
    const loader = new THREE.GLTFLoader();
    loader.load(selectedModel, (gltf) => {
      const model = gltf.scene;
      model.userData.url = selectedModel;
      addElement('model', model);
    });
  };

  const handleStartTracking = async () => {
    if (videoRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startTracking();
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    }
  };

  useEffect(() => {
    if (result) {
      // Update AR scene based on tracking results
      console.log('Tracking result:', result);
      // You would implement logic here to update the AR scene
      // based on the tracking results, e.g., positioning 3D objects
      // on detected faces or aligning them with detected poses
    }
  }, [result]);

  return (
    <div className={styles.arViewer}>
      <h1 className={styles.title}>AR Viewer</h1>
      <div className={styles.controls}>
        <Select onValueChange={(value) => setSelectedModel(value)}>
          <SelectTrigger className={styles.modelSelect}>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAddModel}>Add Model</Button>
        <Select onValueChange={(value: 'image' | 'face' | 'pose') => setTrackingType(value)}>
          <SelectTrigger className={styles.trackingSelect}>
            <SelectValue placeholder="Select tracking type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Image Tracking</SelectItem>
            <SelectItem value="face">Face Tracking</SelectItem>
            <SelectItem value="pose">Pose Tracking</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={isTracking ? stopTracking : handleStartTracking}>
          {isTracking ? 'Stop Tracking' : 'Start Tracking'}
        </Button>
      </div>
      <div className={styles.canvasContainer}>
        <Canvas>
          <Scene />
        </Canvas>
      </div>
      <video ref={videoRef} className={styles.videoFeed} />
    </div>
  );
};

export default ARViewer;