import { projects } from './portfolio.js'
export default projects.map(p => ({ id: p.id, title: p.title, titleSmall: p.lines, attributes: { role: 'AI / ML Engineer', with: p.tag }, distinctions: [], images: [p.id] }))
