import * as THREE from 'three/webgpu'
import { projects } from '../data/portfolio.js'

export function portfolioTexture(id)
{
    const project = projects.find(p => id.includes(p.id)) || projects[0]
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 640
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#251f2b'
    ctx.fillRect(0, 0, 1024, 640)
    ctx.strokeStyle = '#ffffff18'
    for(let x = 0; x < 1024; x += 64) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,640); ctx.stroke() }
    for(let y = 0; y < 640; y += 64) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(1024,y); ctx.stroke() }
    ctx.fillStyle = project.color
    ctx.fillRect(48,60,6,520)
    ctx.font = 'bold 28px sans-serif'
    ctx.fillText('SHARVIN SJ  /  AI + ML', 88, 110)
    ctx.font = 'bold 54px sans-serif'
    project.lines.forEach((line,i) => ctx.fillText(line,88,280+i*72,850))
    ctx.font = '26px sans-serif'
    ctx.fillStyle = '#eee0f0'
    ctx.fillText(project.tag,88,470)
    ctx.fillText('Explore. Build. Learn.',88,550)
    const result = new THREE.CanvasTexture(canvas)
    result.colorSpace = THREE.SRGBColorSpace
    result.flipY = false
    result.minFilter = THREE.LinearFilter
    result.magFilter = THREE.LinearFilter
    result.generateMipmaps = false
    return result
}

export const portfolioLoader = {
    load(path, onLoad) { const result = portfolioTexture(path); queueMicrotask(() => onLoad(result)); return result }
}
