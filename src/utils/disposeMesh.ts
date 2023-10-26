import * as THREE from 'three';

export const disposeMeshGroup = (group: THREE.Object3D) => {
    group.children.forEach((child: THREE.Mesh) => {
        if (child.isMesh) disposeMesh(child);
    });
};

export const disposeMesh = (mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>) => {
    mesh.geometry.dispose();
    mesh.material.dispose();
};
