import * as THREE from "three"
import { projectInitialization, cloneMesh } from "./three/root"
import { checkRendererAspect } from "./three/responsive"
import { aliveCellFactory } from "./three/meshes/alive-cell"
import { gameGridPlaneMesh } from "./three/meshes/plane"
import { highlightOpacityAnimation } from "./three/animation"

import { initializeFieldControls } from "./helpers"
import { createGridMesh } from "./grid";

const { renderer, scene, camera } = projectInitialization()
const ITERATION_PER_SECOND = 10
const MATRIX_SIZE = 50
const field = initializeFieldControls(MATRIX_SIZE)

let isIterating = true
let iteration = 0

const planeMesh = gameGridPlaneMesh(MATRIX_SIZE)
scene.add(planeMesh)
scene.add(...createGridMesh(planeMesh))

const highlightMesh = aliveCellFactory()
highlightMesh.material.visible = false
scene.add(highlightMesh)

const mousePosition = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
let intersectedCell = null

window.addEventListener("mousemove", ({ clientX, clientY }) => {
	mousePosition.x = (clientX / window.innerWidth) * 2 - 1
	mousePosition.y = -(clientY / window.innerHeight) * 2 + 1
	raycaster.setFromCamera(mousePosition, camera)
	intersectedCell = raycaster.intersectObject(planeMesh)[0]

	if(!intersectedCell || isIterating) {
		highlightMesh.material.visible = false
		return 
	}

	const highlightPos = new THREE.Vector3().copy(intersectedCell.point).floor().addScalar(0.5);
	const isCurrentCellAlive = field.isAlive(highlightPos)
	highlightMesh.material.visible = !isCurrentCellAlive
	intersectedCell = isCurrentCellAlive ? null : intersectedCell
	if(!isCurrentCellAlive) { 
		highlightMesh.position.set(highlightPos.x, 0, highlightPos.z)
	}
});

const aliveCellMesh = aliveCellFactory() 
field.display(scene, aliveCellMesh)

window.addEventListener("mousedown", function() {
	if(field.isAlive(highlightMesh.position) || !intersectedCell || isIterating) {
		return
	}

	const aliveCell = cloneMesh(aliveCellMesh, highlightMesh.position);
	field.revive(highlightMesh.position)
	field.saveObject(aliveCell)
	scene.add(aliveCell)
});

function animate(time) {
	if(isIterating && iteration < time / (1000 / ITERATION_PER_SECOND) | 0) {
		iteration++
		const matrix = field.matrix
		for(let x = 0; x < matrix.length; x++)
			for(let z = 0; z < matrix[x].length; z++)
				field.iterate({ x, z })
		field.applyChanges()
		field.display(scene, aliveCellMesh)
	} else {
		highlightMesh.material.opacity = highlightOpacityAnimation(time)
	}

	checkRendererAspect(renderer, camera)
	renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)
window.addEventListener("resize", () => checkRendererAspect(renderer, camera))