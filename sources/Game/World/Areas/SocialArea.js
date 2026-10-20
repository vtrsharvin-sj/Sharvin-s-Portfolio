import * as THREE from 'three/webgpu'
import { Game } from '../../Game.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import socialData from '../../../data/social.js'
import { InstancedGroup } from '../../InstancedGroup.js'
import { Area } from './Area.js'
import { View } from '../../View.js'
import { color } from 'three/tsl'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'

export class SocialArea extends Area
{
    constructor(model)
    {
        super(model)

        this.center = this.references.items.get('center')[0].position

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '👨‍🦲 Social',
                expanded: false,
            })
        }

        this.setLinks()
        this.setFans()
        this.setOnlyFans()
        this.removeStatue()
        this.removeLegacySocials()
        // this.setFWA()
        this.setAchievement()
    }

    setLinks()
    {
        // Objects.getFromModel strips Physical/Dynamic from imported mesh names.
        const statueNames = { X: 'x', GitHub: 'gitHub', Email: 'mail', Instagram: 'twitch', LinkedIn: 'linkedIn', Discord: 'discord', Projects: 'youtube', Portfolio: 'bluesky' }
        for(const link of [...socialData, { name: 'Projects', handle: 'My Projects', align: 'right' }, { name: 'Portfolio', handle: 'sharvinsj.com', url: 'https://sharvinsj.com', align: 'right' }])
        {
            const object = this.objects.items.find(item => item.visual?.object3D.name.startsWith(statueNames[link.name]))
            if(!object) continue
            const statue = object.visual.object3D
            // These are navigation landmarks: keep them on their pedestals even
            // when the car, loose props, or weather hit them.
            object.physical?.body.lockTranslations(true, true)
            object.physical?.body.lockRotations(true, true)
            const position = statue.position.clone()
            position.y = 1
            if(['Instagram', 'Projects', 'Portfolio'].includes(link.name)) this.replaceStatueIcon(statue, link.name)

            this.interactivePoint = this.game.interactivePoints.create(
                position,
                link.name === 'Projects' ? 'My Projects' : `${link.name} · ${link.name === 'Email' || link.name === 'Portfolio' ? '' : '@'}${link.handle}`,
                link.align === 'left' ? InteractivePoints.ALIGN_LEFT : InteractivePoints.ALIGN_RIGHT,
                InteractivePoints.STATE_CONCEALED,
                () =>
                {
                    if(link.name === 'Projects')
                        this.game.menu.open('projects')
                    else if(link.url)
                        link.name === 'Email' ? window.location.assign(link.url) : window.open(link.url, '_blank', 'noopener,noreferrer')
                    else if(link.modal)
                        this.game.modals.open(link.modal)
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.addItems(['interact'])
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.removeItems(['interact'])
                },
                () =>
                {
                    this.game.inputs.interactiveButtons.removeItems(['interact'])
                }
            )
            
        }
    }

    replaceStatueIcon(statue, name)
    {
        // Preserve the original physics statue and location, replacing only its icon.
        statue.traverse(child => { if(child.isMesh) child.visible = false })
        if(statue.isMesh) statue.material = new THREE.MeshBasicNodeMaterial({ visible: false })
        statue.visible = true
        const material = new MeshDefaultMaterial({ colorNode: color('#918472') })
        const detailMaterial = new MeshDefaultMaterial({ colorNode: color('#352c47') })
        const icon = new THREE.Group()
        const extrude = (shape, detail = false) => {
            const depth = detail ? 0.025 : 0.42
            const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: detail ? 0.008 : 0.045, bevelSize: detail ? 0.008 : 0.045, bevelSegments: 1, curveSegments: 12 })
            geometry.translate(0, 0, detail ? 0.255 : -depth / 2)
            const mesh = new THREE.Mesh(geometry, detail ? detailMaterial : material)
            mesh.castShadow = true
            icon.add(mesh)
            return mesh
        }
        const rounded = (size, radius) => {
            const path = new THREE.Shape()
            const half = size / 2
            path.moveTo(-half + radius, -half)
            path.lineTo(half - radius, -half)
            path.quadraticCurveTo(half, -half, half, -half + radius)
            path.lineTo(half, half - radius)
            path.quadraticCurveTo(half, half, half - radius, half)
            path.lineTo(-half + radius, half)
            path.quadraticCurveTo(-half, half, -half, half - radius)
            path.lineTo(-half, -half + radius)
            path.quadraticCurveTo(-half, -half, -half + radius, -half)
            return path
        }
        const ring = (rx, ry, width) => {
            const outline = new THREE.Shape()
            outline.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0)
            const hole = new THREE.Path()
            hole.absellipse(0, 0, rx - width, ry - width, 0, Math.PI * 2, true, 0)
            outline.holes.push(hole)
            extrude(outline, true)
        }
        if(name === 'Instagram')
        {
            extrude(rounded(1.7, 0.35))
            const outline = rounded(1.34, 0.31)
            outline.holes.push(new THREE.Path(rounded(1.12, 0.23).getPoints(24)))
            extrude(outline, true)
            ring(0.36, 0.36, 0.11)
            const dot = new THREE.Shape()
            dot.absarc(0.43, 0.43, 0.08, 0, Math.PI * 2, false)
            extrude(dot, true)
        }
        else if(name === 'Portfolio')
        {
            icon.quaternion.copy(statue.quaternion).invert()
            // Solid, faceted globe with surface meridians, matching the low-poly world.
            const sphereMaterial = new MeshDefaultMaterial({ colorNode: color('#918472') })
            sphereMaterial.flatShading = true
            const globe = new THREE.Mesh(new THREE.SphereGeometry(0.78, 20, 12), sphereMaterial)
            globe.castShadow = true
            icon.add(globe)
            for(const rotation of [0, Math.PI / 2])
            {
                const meridian = new THREE.Mesh(new THREE.TorusGeometry(0.785, 0.027, 4, 40), detailMaterial)
                meridian.rotation.y = rotation
                icon.add(meridian)
            }
            for(const latitude of [-0.36, 0, 0.36])
            {
                const radius = Math.sqrt(0.785 ** 2 - latitude ** 2)
                const parallel = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.027, 4, 40), detailMaterial)
                parallel.rotation.x = Math.PI / 2
                parallel.position.y = latitude
                icon.add(parallel)
            }
            const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.25,0.23,8), material)
            stand.position.y = -0.86
            icon.add(stand)
        }
        else
        {
            const folder = new THREE.Shape()
            folder.moveTo(-0.94,-0.65)
            folder.lineTo(0.94,-0.65)
            folder.lineTo(0.94,0.52)
            folder.lineTo(-0.06,0.52)
            folder.lineTo(-0.28,0.78)
            folder.lineTo(-0.94,0.78)
            folder.closePath()
            extrude(folder)
            const seam = new THREE.Mesh(new THREE.BoxGeometry(1.65,0.045,0.025), detailMaterial)
            seam.position.set(0,0.34,0.27)
            icon.add(seam)
            for(const direction of [-1, 1])
            {
                const chevron = new THREE.Shape()
                const points = [[0.28,0.18],[0.48,-0.06],[0.28,-0.3],[0.18,-0.21],[0.31,-0.06],[0.18,0.09]]
                points.forEach(([x,y], i) => i ? chevron.lineTo(x * direction,y) : chevron.moveTo(x * direction,y))
                chevron.closePath()
                extrude(chevron, true)
            }
        }
        statue.add(icon)
    }

    setFans()
    {
        const baseFan = this.references.items.get('fan')[0]
        baseFan.castShadow = true
        baseFan.receiveShadow = true

        baseFan.position.set(0, 0, 0)

        // Update materials 
        this.game.materials.updateObject(baseFan)

        baseFan.removeFromParent()
        
        this.fans = {}
        this.fans.spawnerPosition = this.references.items.get('onlyFans')[0].position
        this.fans.count = 30
        this.fans.visibleCount = 0
        this.fans.currentIndex = 0
        this.fans.mass = 0.02
        this.fans.objects = []

        const references = []

        for(let i = 0; i < this.fans.count; i++)
        {
            // Reference
            const reference = new THREE.Object3D()

            reference.position.copy(this.fans.spawnerPosition)
            reference.position.y += 99
            reference.needsUpdate = true
            references.push(reference)
            
            // Object
            const object = this.game.objects.add(
                {
                    model: reference,
                    updateMaterials: false,
                    castShadow: false,
                    receiveShadow: false,
                    parent: null,
                },
                {
                    type: 'dynamic',
                    position: reference.position,
                    rotation: reference.quaternion,
                    friction: 0.7,
                    mass: this.fans.mass,
                    sleeping: true,
                    enabled: false,
                    colliders: [ { shape: 'cuboid', parameters: [ 0.45, 0.65, 0.45 ], category: 'object' } ],
                    waterGravityMultiplier: - 1
                },
            )

            this.fans.objects.push(object)
        }

        this.fans.instancedGroup = new InstancedGroup(references, baseFan)

        this.fans.pop = () =>
        {
            const object = this.fans.objects[this.fans.currentIndex]

            const spawnPosition = this.fans.spawnerPosition.clone()
            spawnPosition.x += (Math.random() - 0.5) * 4
            spawnPosition.y += 4 * Math.random()
            spawnPosition.z += (Math.random() - 0.5) * 4
            object.physical.body.setTranslation(spawnPosition)
            object.physical.body.setEnabled(true)
            object.physical.body.setLinvel({ x: 0, y: 0, z: 0 })
            object.physical.body.setAngvel({ x: 0, y: 0, z: 0 })
            object.physical.body.wakeUp()
            // this.game.ticker.wait(1, () =>
            // {
            //     object.physical.body.applyImpulse({
            //         x: (Math.random() - 0.5) * this.fans.mass * 2,
            //         y: Math.random() * this.fans.mass * 3,
            //         z: this.fans.mass * 7
            //     }, true)
            //     object.physical.body.applyTorqueImpulse({ x: 0, y: 0, z: 0 }, true)
            // })

            this.fans.currentIndex = (this.fans.currentIndex + 1) % this.fans.count

            this.fans.visibleCount = Math.min(this.fans.visibleCount + 1, this.fans.count)

            // Sound
            this.game.audio.groups.get('click').play(true)

            // Achievement
            this.game.achievements.setProgress('fan', 1)
        }
    }

    setOnlyFans()
    {
        const interactiveArea = this.game.interactivePoints.create(
            this.references.items.get('onlyFans')[0].position,
            'Cooling fans',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.fans.pop()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )
    }

    removeStatue()
    {
        const reference = this.references.items.get('statue')[0]
        const object = reference.userData.object
        const visual = object.visual.object3D
        visual.visible = false
        // Keep area visibility changes from restoring the removed sculpture.
        this.objects.hideable = this.objects.hideable.filter(item => item !== visual)
        object.physical.body.setEnabled(false)
        for(const collider of object.physical.colliders || []) collider.setEnabled(false)
    }

    removeLegacySocials()
    {
        for(const object of this.objects.items)
        {
            if(/^(onlyfans|boy)/i.test(object.visual?.object3D.name || ''))
            {
                object.visual.object3D.visible = false
                this.objects.hideable = this.objects.hideable.filter(item => item !== object.visual.object3D)
                for(const collider of object.physical?.colliders || []) collider.setEnabled(false)
            }
        }
    }

    setFWA()
    {
        this.fwa = {}

        // Confetti
        let i = 0
        this.fwa.positions = [
            new THREE.Vector3(23.5, 0, -18.5),
            new THREE.Vector3(27, 0, -19.5),
        ]
        const pop = () =>
        {
            i++
            const position = this.fwa.positions[i % this.fwa.positions.length]
            this.game.world.confetti.pop(position)
            
            setTimeout(pop, 500 + Math.random() * 1500)
        }
        setTimeout(pop, 2000)
        
        // Interactive points
        game.interactivePoints.temporaryHide()

        // Input => start
        this.game.inputs.addActions([
            { name: 'startFWA', categories: [ 'intro', 'modal', 'menu', 'racing', 'cinematic', 'wandering' ], keys: [ 'Keyboard.k' ] },
            { name: 'winFWA', categories: [ 'intro', 'modal', 'menu', 'racing', 'cinematic', 'wandering' ], keys: [ 'Keyboard.j' ] },
        ])
        this.game.inputs.events.on('startFWA', (action) =>
        {
            if(action.active)
            {
                // View
                game.view.zoom.baseRatio = 0.55
                game.view.zoom.ratio = 0.55
                game.view.zoom.smoothedRatio = 0.55
                game.view.focusPoint.position.set(25, 0, -19.2)
                game.view.focusPoint.isTracking = false
                window.setTimeout(() =>
                {
                    this.game.view.setMode(View.MODE_FREE)
                }, 1000)

                // Weather
                this.game.weather.override.start(
                    {
                        humidity: 0,
                        electricField: 0,
                        clouds: 0,
                        wind: 0
                    },
                    0
                )
        
                // Day cycles
                this.game.dayCycles.override.start(
                    {
                        progress: 0.87
                    },
                    0
                )
                
                // Buttons
                document.querySelector('.js-menu-trigger').style.display = 'none'
                document.querySelector('.js-map-trigger').style.display = 'none'
            }
        })
        this.game.inputs.events.on('winFWA', (action) =>
        {
            if(action.active)
            {
                this.game.achievements.setProgress('foty', 1)
            }
        })
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'social')
        })
    }

    update()
    {
        if(this.fans.visibleCount)
        {
            let allFansSleeping = true
            for(const fan of this.fans.objects)
                allFansSleeping = allFansSleeping && fan.physical.body.isSleeping()

            if(!allFansSleeping)
                this.fans.instancedGroup.updateBoundings()
        }
    
        for(const object of this.fans.objects)
        {
            if(!object.physical.body.isSleeping() && object.physical.body.isEnabled())
                object.visual.object3D.needsUpdate = true
        }
    }
}
