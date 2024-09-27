import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import styles from '../styles/components/Dashboard.module.css';

interface Project {
  id: string;
  name: string;
  description: string;
  lastModified: string;
}

const Dashboard: React.FC = () => {
  const projects: Project[] = [
    { id: '1', name: '3D Product Viewer', description: 'Interactive 3D model viewer for e-commerce', lastModified: '2023-09-15' },
    { id: '2', name: 'AR Business Card', description: 'Augmented reality experience for business cards', lastModified: '2023-09-10' },
    { id: '3', name: 'Virtual Try-On', description: 'AR-powered virtual try-on for fashion items', lastModified: '2023-09-05' },
  ];

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Dashboard</h1>
      <Button className={styles.newProjectButton}>New Project</Button>
      <div className={styles.projectGrid}>
        {projects.map((project) => (
          <Card key={project.id} className={styles.projectCard}>
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={styles.lastModified}>Last modified: {project.lastModified}</p>
              <div className={styles.cardActions}>
                <Button variant="outline">Edit</Button>
                <Button variant="outline">View</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;