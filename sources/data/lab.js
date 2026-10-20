import { projects } from './portfolio.js'
export default projects.map(p => ({ id: p.id, title: p.title, image: p.id, imageMini: p.id }))
