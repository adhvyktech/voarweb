import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Minus, Move, RotateCw, Maximize, Image as ImageIcon, Cube, Video, Play, Pause, Square, Undo, Redo } from 'lucide-react';
import styles from '../styles/components/ARBuilder.module.css';

interface ARElement {
  id: string;
  type: 'model' | 'image' | 'video';
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  animations: Animation[];
  url: string;
}

interface Animation {
  id: string;
  property: 'position' | 'rotation' | 'scale';
  startValue: number[];
  endValue: number[];
  duration: number;
  startTime: number;
  easing: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
}

interface HistoryState {
  elements: ARElement[];
  timeline: Animation[];
}

const ARBuilder: React.FC = () => {
  const [projectName, setProjectName] = useState<string>('New AR Project');
  const [elements, setElements] = useState<ARElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<ARElement | null>(null);
  const [timeline, setTimeline] = useState<Animation[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [totalDuration, setTotalDuration] = useState<number>(10000); // 10 seconds
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const addElement = (type: ARElement['type']) => {
    const newElement: ARElement = {
      id: Date.now().toString(),
      type,
      name: `New ${type}`,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      animations: [],
      url: type === 'model' ? '/assets/models/robot.glb' : '/placeholder.svg?height=200&width=200',
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    setSelectedElement(newElement);
    addToHistory({ elements: newElements, timeline });
  };

  const updateElement = (id: string, updates: Partial<ARElement>) => {
    const updatedElements = elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    );
    setElements(updatedElements);
    setSelectedElement(updatedElements.find(el => el.id === id) || null);
    addToHistory({ elements: updatedElements, timeline });
  };

  const deleteElement = (id: string) => {
    const newElements = elements.filter(el => el.id !== id);
    setElements(newElements);
    setSelectedElement(null);
    const newTimeline = timeline.filter(anim => anim.id.split('-')[0] !== id);
    setTimeline(newTimeline);
    addToHistory({ elements: newElements, timeline: newTimeline });
  };

  const addAnimation = () => {
    if (selectedElement) {
      const newAnimation: Animation = {
        id: `${selectedElement.id}-${Date.now()}`,
        property: 'position',
        startValue: [0, 0, 0],
        endValue: [1, 1, 1],
        duration: 1000,
        startTime: 0,
        easing: 'linear',
      };
      const newTimeline = [...timeline, newAnimation];
      setTimeline(newTimeline);
      addToHistory({ elements, timeline: newTimeline });
    }
  };

  const updateAnimation = (id: string, updates: Partial<Animation>) => {
    const updatedTimeline = timeline.map(anim => 
      anim.id === id ? { ...anim, ...updates } : anim
    );
    setTimeline(updatedTimeline);
    addToHistory({ elements, timeline: updatedTimeline });
  };

  const deleteAnimation = (id: string) => {
    const newTimeline = timeline.filter(anim => anim.id !== id);
    setTimeline(newTimeline);
    addToHistory({ elements, timeline: newTimeline });
  };

  const playTimeline = useCallback(() => {
    setIsPlaying(true);
    const startTime = Date.now();
    const animate = () => {
      const currentTime = Date.now() - startTime;
      setCurrentTime(currentTime);
      if (currentTime < totalDuration && isPlaying) {
        requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
    requestAnimationFrame(animate);
  }, [totalDuration, isPlaying]);

  const pauseTimeline = () => {
    setIsPlaying(false);
  };

  const resetTimeline = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const addToHistory = (state: HistoryState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const prevState = history[historyIndex - 1];
      setElements(prevState.elements);
      setTimeline(prevState.timeline);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const nextState = history[historyIndex + 1];
      setElements(nextState.elements);
      setTimeline(nextState.timeline);
    }
  };

  const ARScene: React.FC = () => {
    const { scene } = useThree();

    useEffect(() => {
      elements.forEach(element => {
        let object: THREE.Object3D | null = null;

        if (element.type === 'model') {
          const { scene: modelScene } = useGLTF(element.url);
          object = modelScene.clone();
        } else if (element.type === 'image' || element.type === 'video') {
          const geometry = new THREE.PlaneGeometry(1, 1);
          const material = new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(element.url) });
          object = new THREE.Mesh(geometry, material);
        }

        if (object) {
          object.position.set(element.position.x, element.position.y, element.position.z);
          object.rotation.set(element.rotation.x, element.rotation.y, element.rotation.z);
          object.scale.setScalar(element.scale);
          scene.add(object);
        }
      });

      return () => {
        scene.clear();
      };
    }, [elements, scene]);

    useFrame(() => {
      if (isPlaying) {
        elements.forEach(element => {
          const object = scene.getObjectByName(element.id);
          if (object) {
            element.animations.forEach(animation => {
              if (currentTime >= animation.startTime && currentTime <= animation.startTime + animation.duration) {
                const progress = (currentTime - animation.startTime) / animation.duration;
                const easedProgress = getEasedValue(progress, animation.easing);
                const value = animation.startValue.map((start, index) => 
                  start + (animation.endValue[index] - start) * easedProgress
                );

                switch (animation.property) {
                  case 'position':
                    object.position.set(value[0], value[1], value[2]);
                    break;
                  case 'rotation':
                    object.rotation.set(value[0], value[1], value[2]);
                    break;
                  case 'scale':
                    object.scale.set(value[0], value[0], value[0]);
                    break;
                }
              }
            });
          }
        });
      }
    });

    return null;
  };

  const getEasedValue = (t: number, easing: Animation['easing']) => {
    switch (easing) {
      case 'linear':
        return t;
      case 'easeInQuad':
        return t * t;
      case 'easeOutQuad':
        return t * (2 - t);
      case 'easeInOutQuad':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t;
    }
  };

  return (
    <div className={styles.arBuilder}>
      <h1 className={styles.title}>AR Builder</h1>
      <div className={styles.projectHeader}>
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className={styles.projectNameInput}
        />
        <Button>Save Project</Button>
        <Button onClick={undo} disabled={historyIndex <= 0}><Undo className="mr-2 h-4 w-4" /> Undo</Button>
        <Button onClick={redo} disabled={historyIndex >= history.length - 1}><Redo className="mr-2 h-4 w-4" /> Redo</Button>
      </div>
      <div className={styles.builderContent}>
        <div className={styles.scenePanel}>
          <h2 className={styles.panelTitle}>Scene</h2>
          <div className={styles.addElementButtons}>
            <Button onClick={() => addElement('model')}><Plus className="mr-2 h-4 w-4" /> 3D Model</Button>
            <Button onClick={() => addElement('image')}><Plus className="mr-2 h-4 w-4" /> Image</Button>
            <Button onClick={() => addElement('video')}><Plus className="mr-2 h-4 w-4" /> Video</Button>
          </div>
          <div className={styles.elementList}>
            {elements.map(element => (
              <Card 
                key={element.id} 
                className={`${styles.elementCard} ${selectedElement?.id === element.id ? styles.selectedElement : ''}`}
                onClick={() => setSelectedElement(element)}
              >
                <CardHeader>
                  <CardTitle className={styles.elementName}>{element.name}</CardTitle>
                  <CardDescription>{element.type}</CardDescription>
                </CardHeader>
                <CardContent>
                  {element.type === 'model' && <Cube className={styles.elementIcon} />}
                  {element.type === 'image' && <ImageIcon className={styles.elementIcon} />}
                  {element.type === 'video' && <Video className={styles.elementIcon} />}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className={styles.propertiesPanel}>
          <h2 className={styles.panelTitle}>Properties</h2>
          {selectedElement ? (
            <div className={styles.properties}>
              <div className={styles.propertyGroup}>
                <Label htmlFor="elementName">Name</Label>
                <Input
                  id="elementName"
                  value={selectedElement.name}
                  onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
                />
              </div>
              <div className={styles.propertyGroup}>
                <Label>Position</Label>
                <div className={styles.vectorInput}>
                  <Input
                    type="number"
                    value={selectedElement.position.x}
                    onChange={(e) => updateElement(selectedElement.id, { position: { ...selectedElement.position, x: parseFloat(e.target.value) } })}
                  />
                  <Input
                    type="number"
                    value={selectedElement.position.y}
                    onChange={(e) => updateElement(selectedElement.id, { position: { ...selectedElement.position, y: parseFloat(e.target.value) } })}
                  />
                  <Input
                    type="number"
                    value={selectedElement.position.z}
                    onChange={(e) => updateElement(selectedElement.id, { position: { ...selectedElement.position, z: parseFloat(e.target.value) } })}
                  />
                </div>
              </div>
              <div className={styles.propertyGroup}>
                <Label>Rotation</Label>
                <div className={styles.vectorInput}>
                  <Input
                    type="number"
                    value={selectedElement.rotation.x}
                    onChange={(e) => updateElement(selectedElement.id, { rotation: { ...selectedElement.rotation, x: parseFloat(e.target.value) } })}
                  />
                  <Input
                    type="number"
                    value={selectedElement.rotation.y}
                    onChange={(e) => updateElement(selectedElement.id, { rotation: { ...selectedElement.rotation, y: parseFloat(e.target.value) } })}
                  />
                  <Input
                    type="number"
                    value={selectedElement.rotation.z}
                    onChange={(e) => updateElement(selectedElement.id, { rotation: { ...selectedElement.rotation, z: parseFloat(e.target.value) } })}
                  />
                </div>
              </div>
              <div className={styles.propertyGroup}>
                <Label>Scale</Label>
                <Slider
                  value={[selectedElement.scale]}
                  min={0.1}
                  max={2}
                  step={0.1}
                  onValueChange={(value) => updateElement(selectedElement.id, { scale: value[0] })}
                />
              </div>
              <Button variant="destructive" onClick={() => deleteElement(selectedElement.id)}>Delete Element</Button>
            </div>
          ) : (
            <p>Select an element to edit its properties</p>
          )}
        </div>
      </div>
      <div className={styles.previewPanel}>
        <h2 className={styles.panelTitle}>Preview</h2>
        <div className={styles.previewContainer}>
          <Canvas>
            <ARScene />
            <OrbitControls />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
          </Canvas>
        </div>
      </div>
      <div className={styles.timelinePanel}>
        <h2 className={styles.panelTitle}>Timeline</h2>
        <div className={styles.timelineControls}>
          <Button onClick={playTimeline} disabled={isPlaying}><Play className="mr-2 h-4 w-4" /> Play</Button>
          <Button onClick={pauseTimeline} disabled={!isPlaying}><Pause className="mr-2 h-4 w-4" /> Pause</Button>
          <Button onClick={resetTimeline}><Square className="mr-2 h-4 w-4" /> Reset</Button>
          <Button onClick={addAnimation} disabled={!selectedElement}><Plus className="mr-2 h-4 w-4" /> Add Animation</Button>
        </div>
        <div className={styles.timelineTrack}>
          {timeline.map(animation => (
            <div
              key={animation.id}
              className={styles.timelineItem}
              style={{
                left: `${(animation.startTime / totalDuration) * 100}%`,
                width: `${(animation.duration / totalDuration) * 100}%`,
              }}
            >
              {animation.property}
            </div>
          ))}
          <div
            className={styles.timelineCursor}
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          />
        </div>
        <div className={styles.animationList}>
          {timeline.map(animation => (
            <Card key={animation.id} className={styles.animationCard}>
              <CardHeader>
                <CardTitle>{animation.property} Animation</CardTitle>
                <CardDescription>{`Duration: ${animation.duration}ms`}</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={animation.property}
                  onValueChange={(value: 'position' | 'rotation' | 'scale') => 
                    updateAnimation(animation.id, { property: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="position">Position</SelectItem>
                    <SelectItem value="rotation">Rotation</SelectItem>
                    <SelectItem value="scale">Scale</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={animation.duration}
                  onChange={(e) => updateAnimation(animation.id, { duration: parseInt(e.target.value) })}
                  placeholder="Duration (ms)"
                />
                <Select
                  value={animation.easing}
                  onValueChange={(value: Animation['easing']) => 
                    updateAnimation(animation.id, { easing: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select easing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="easeInQuad">Ease In</SelectItem>
                    <SelectItem value="easeOutQuad">Ease Out</SelectItem>
                    <SelectItem value="easeInOutQuad">Ease In Out</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="destructive" onClick={() => deleteAnimation(animation.id)}>Delete</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ARBuilder;