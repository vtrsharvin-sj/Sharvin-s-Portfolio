import * as THREE from 'three/webgpu'

const text = `
 SHARVIN SJ — AI / ML ENGINEER & DEVELOPER

╔═ Hello ═══════════════╗
║ I’m Sharvin SJ — a 13-year-old AI / ML engineer and developer in Coimbatore, India.
║ I build curious experiments across AI, machine learning, software, and hardware.
╚═══════════════════════╝

╔═ Contact ═════════════╗
║ Email     ⇒ sharvin@sharvinsj.com
║ Portfolio ⇒ Explore My Projects in the menu
║ Website   ⇒ https://sharvinsj.com
╚═══════════════════════╝

╔═ Featured work ═══════╗
║ • AI-based smart agriculture rover
║ • Precision pesticide detection & spraying
║ • Smart traffic monitoring & incident detection
║ • AI-based automatic billing system
║ • Battery remaining-useful-life prediction with Random Forest
╚═══════════════════════╝

╔═ Toolkit ═════════════╗
║ Python · C · C++ · JavaScript · Node.js · Machine Learning · AI
║ AWS · Kaggle · Ultralytics · Hugging Face
╚═══════════════════════╝

╔═ Built with ══════════╗
║ This interactive portfolio uses Three.js r${THREE.REVISION}, Rapier, and Howler.js.
╚═══════════════════════╝
`
let finalText = ''
let finalStyles = []
const stylesSet = {
    letter: 'color: #ffffff; font: 400 1em monospace;',
    pipe: 'color: #7ee787; font: 400 1em monospace;',
}
let currentStyle = null
for(let i = 0; i < text.length; i++)
{
    const char = text[i]
    const style = char.match(/[╔║═╗╚╝]/) ? 'pipe' : 'letter'
    if(style !== currentStyle)
    {
        currentStyle = style
        finalText += '%c'
        finalStyles.push(stylesSet[currentStyle])
    }
    finalText += char
}

export default [finalText, ...finalStyles]
