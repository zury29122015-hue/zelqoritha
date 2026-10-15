import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { RenderedPart } from '../api'

interface Props {
  parts: RenderedPart[]
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export function StlViewer({ parts }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1d2026)

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 5000)
    camera.position.set(120, 120, 160)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(1, 1, 1)
    scene.add(dir)
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.3)
    dir2.position.set(-1, -0.5, -1)
    scene.add(dir2)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const loader = new STLLoader()
    const group = new THREE.Group()
    scene.add(group)

    for (const part of parts) {
      const geometry = loader.parse(base64ToArrayBuffer(part.stlBase64))
      geometry.computeVertexNormals()
      const material = new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.5, metalness: 0.05 })
      const mesh = new THREE.Mesh(geometry, material)
      group.add(mesh)
    }

    // centra la cámara en el bounding box combinado
    const box = new THREE.Box3().setFromObject(group)
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3()).length()
      controls.target.copy(center)
      camera.position.copy(center).add(new THREE.Vector3(size * 0.6, size * 0.5, size * 0.8))
      camera.near = size / 100
      camera.far = size * 20
      camera.updateProjectionMatrix()
    }

    let frameId: number
    function animate() {
      frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    function onResize() {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [parts])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
