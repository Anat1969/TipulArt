import { useMemo, useRef, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { makeArtTexture } from './artTextures'

// סצנת דף הבית: חומרי יצירה שמתארגנים מחדש בכל פרק.
// 0 פתיחה, 1 חזון (ציר זמן), 2 מטרה (שעון של דקה), 3 כלים (חמש תחנות), 4 תוצאות (דפוס עולה).
type Pose = { p: [number, number, number]; r: [number, number, number]; s: number }
type Kind = 'sheet' | 'clay' | 'stick' | 'dot'
type Item = { kind: Kind; index: number; poses: Pose[]; color?: string }

const PHASES = 5
const ETC_COLORS = ['#b5543a', '#b8862b', '#3b4a63', '#6f7d62']
const TAU = Math.PI * 2

function pose(p: [number, number, number], r: [number, number, number] = [0, 0, 0], s = 1): Pose {
  return { p, r, s }
}

function buildItems(): Item[] {
  const items: Item[] = []
  for (let k = 0; k < 5; k++) {
    items.push({
      kind: 'sheet',
      index: k,
      poses: [
        pose([-1.3 + k * 0.62, 0.35 + k * 0.06, -k * 0.32], [0.05, 0.3 - k * 0.13, -0.28 + k * 0.14], 1),
        pose([3.2 - k * 1.6, 1.05, -0.2], [0, 0, (k % 2 ? 1 : -1) * 0.05], 0.55),
        pose([0, 0.05, -0.6 - k * 0.04], [0, 0, k * 0.05 - 0.1], 0.72),
        pose([0.6 - k * 1.3, 1.25, -0.4], [0, (k - 2) * -0.12, 0], 0.55),
        pose([2.4 - k * 1.2, 1.55 - Math.abs(k - 2) * 0.22, -1.8], [0, (k - 2) * -0.2, 0], 0.5),
      ],
    })
  }
  items.push({
    kind: 'clay',
    index: 0,
    poses: [
      pose([1.0, -1.05, 1.2], [0, 0, 0], 0.62),
      pose([-3.95, -0.6, 0.1], [0, 0, 0], 0.3),
      pose([0, -0.05, 0.4], [0, 0, 0], 0.45),
      pose([-4.6, 0.2, -0.3], [0, 0, 0], 0.32),
      pose([-3.45, 1.55, 0.3], [0, 0, 0], 0.4),
    ],
  })
  const stickPoses: Pose[][] = [
    [
      pose([-1.7, -1.3, 1.0], [0, 0.3, 1.2], 1),
      pose([2.2, -0.6, -0.05], [0, 0, Math.PI / 2], 1.55),
      pose([0, 0.65, 0.55], [0, 0, 0], 0.9),
      pose([-0.7, -1.1, -0.2], [0, 0, Math.PI / 2], 1.1),
      pose([3.75, -0.2, 0], [0, 0, 0], 2.4),
    ],
    [
      pose([-0.5, -1.5, 1.45], [0.2, -0.3, 1.45], 1),
      pose([0, -0.6, -0.05], [0, 0, Math.PI / 2], 1.55),
      pose([0.45, 0.25, 0.55], [0, 0, -1.05], 0.65),
      pose([-3.3, -1.1, -0.2], [0, 0, Math.PI / 2], 1.1),
      pose([0.2, -1.95, 0], [0, 0, Math.PI / 2], 5.6),
    ],
    [
      pose([2.0, -1.2, 0.4], [0, 0.5, 0.9], 1),
      pose([-2.2, -0.6, -0.05], [0, 0, Math.PI / 2], 1.55),
      pose([0, -2.55, 0], [0, 0, Math.PI / 2], 1.6),
      pose([-2, -2.6, -2], [0, 0, Math.PI / 2], 0.001),
      pose([0, -2.8, -2], [0, 0, Math.PI / 2], 0.001),
    ],
  ]
  stickPoses.forEach((poses, i) => items.push({ kind: 'stick', index: i, poses }))
  for (let j = 0; j < 12; j++) {
    const a = (j / 12) * TAU
    const t = j / 11
    items.push({
      kind: 'dot',
      index: j,
      color: ETC_COLORS[j % 4],
      poses: [
        pose([Math.cos(a) * 2.7 - 0.5, Math.sin(a) * 1.6 + 0.1, Math.sin(a) * 1.2], [0, 0, 0], 0.9),
        pose([3.3 - j * 0.6, -0.6 + Math.sin(j * 0.9) * 0.08, 0.15], [0, 0, 0], 1),
        pose([Math.sin(a) * 2.05, Math.cos(a) * 2.05, 0.3], [0, 0, 0], j % 3 === 0 ? 1.35 : 0.9),
        pose([0.6 - (j % 5) * 1.3, -0.15 - Math.floor(j / 5) * 0.34, -0.2], [0, 0, 0], 0.7),
        pose([3.3 - j * 0.6, -1.6 + Math.pow(t, 1.5) * 3.0, Math.sin(j * 0.7) * 0.35], [0, 0, 0], 1.1),
      ],
    })
  }
  return items
}

const smooth = (x: number) => x * x * (3 - 2 * x)

function samplePose(item: Item, phase: number, out: Pose) {
  const a = Math.max(0, Math.min(PHASES - 1, Math.floor(phase)))
  const b = Math.min(PHASES - 1, a + 1)
  const t = smooth(Math.max(0, Math.min(1, phase - a)))
  const A = item.poses[a]
  const B = item.poses[b]
  for (let i = 0; i < 3; i++) {
    out.p[i] = A.p[i] + (B.p[i] - A.p[i]) * t
    out.r[i] = A.r[i] + (B.r[i] - A.r[i]) * t
  }
  out.s = A.s + (B.s - A.s) * t
}

function clayGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 24)
  const pos = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n =
      Math.sin(v.x * 3.1 + 1.3) * Math.cos(v.y * 2.7) * 0.09 +
      Math.sin(v.z * 5.3 + v.x * 2.1) * 0.04 +
      Math.cos(v.y * 7.1 + v.z * 3.3) * 0.02
    v.multiplyScalar(1 + n)
    v.y *= 0.82
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

function Composition({ phaseRef, still }: { phaseRef: MutableRefObject<number>; still: boolean }) {
  const items = useMemo(buildItems, [])
  const refs = useRef<(THREE.Object3D | null)[]>([])
  const group = useRef<THREE.Group>(null)
  const current = useRef(phaseRef.current)
  const tmp = useMemo<Pose>(() => ({ p: [0, 0, 0], r: [0, 0, 0], s: 1 }), [])
  const { viewport, pointer } = useThree()

  const sheetGeo = useMemo(() => new THREE.BoxGeometry(1.6, 2.1, 0.025), [])
  const sheetMats = useMemo(
    () =>
      Array.from({ length: 5 }, (_, k) => {
        const art = new THREE.MeshStandardMaterial({ map: makeArtTexture(k), roughness: 0.92, metalness: 0 })
        const edge = new THREE.MeshStandardMaterial({ color: '#efe7d8', roughness: 0.95 })
        return [edge, edge, edge, edge, art, edge]
      }),
    [],
  )
  const clayGeo = useMemo(clayGeometry, [])
  const stickGeo = useMemo(() => new THREE.CylinderGeometry(0.055, 0.065, 1.4, 10), [])
  const dotGeo = useMemo(() => new THREE.SphereGeometry(0.12, 24, 16), [])

  useFrame((state, delta) => {
    const target = phaseRef.current
    current.current = still ? target : THREE.MathUtils.damp(current.current, target, 3.2, delta)
    const ph = current.current
    const time = state.clock.elapsedTime
    items.forEach((item, i) => {
      const o = refs.current[i]
      if (!o) return
      samplePose(item, ph, tmp)
      const bob = still ? 0 : Math.sin(time * 0.8 + i * 1.7) * 0.05
      o.position.set(tmp.p[0], tmp.p[1] + bob, tmp.p[2])
      o.rotation.set(tmp.r[0], tmp.r[1], tmp.r[2])
      if (item.kind === 'stick') o.scale.set(1, tmp.s, 1)
      else o.scale.setScalar(tmp.s)
      if (item.kind === 'clay' && !still) o.rotation.y = time * 0.25
    })
    if (group.current) {
      const wide = viewport.width > 9
      const tx = wide ? -viewport.width * 0.17 : 0
      const sc = wide ? 0.92 : Math.min(0.62, viewport.width / 11)
      group.current.position.x = THREE.MathUtils.damp(group.current.position.x, tx, 4, delta)
      group.current.position.y = wide ? 0 : 0.6
      group.current.scale.setScalar(sc)
      const px = still ? 0 : pointer.x * 0.12
      const py = still ? 0 : pointer.y * 0.08
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, -0.18 + px, 3, delta)
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, 0.06 - py, 3, delta)
    }
  })

  return (
    <group ref={group}>
      {items.map((item, i) => {
        const setRef = (o: THREE.Object3D | null) => {
          refs.current[i] = o
        }
        if (item.kind === 'sheet')
          return <mesh key={i} ref={setRef} geometry={sheetGeo} material={sheetMats[item.index]} castShadow receiveShadow />
        if (item.kind === 'clay')
          return (
            <mesh key={i} ref={setRef} geometry={clayGeo} castShadow>
              <meshStandardMaterial color="#b0603f" roughness={0.78} metalness={0.02} />
            </mesh>
          )
        if (item.kind === 'stick')
          return (
            <mesh key={i} ref={setRef} geometry={stickGeo} castShadow>
              <meshStandardMaterial color="#232428" roughness={1} />
            </mesh>
          )
        return (
          <mesh key={i} ref={setRef} geometry={dotGeo} castShadow>
            <meshStandardMaterial color={item.color} roughness={0.35} metalness={0.05} />
          </mesh>
        )
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.1, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={0.14} />
      </mesh>
    </group>
  )
}

export default function HomeScene({ phaseRef, still }: { phaseRef: MutableRefObject<number>; still: boolean }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 9.5], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden="true"
    >
      <hemisphereLight args={['#fff6e8', '#c9b9a0', 0.75]} />
      <directionalLight
        position={[5, 8, 6]}
        intensity={1.6}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-6, 2, -4]} intensity={0.35} color="#b9c6dd" />
      <Composition phaseRef={phaseRef} still={still} />
    </Canvas>
  )
}
