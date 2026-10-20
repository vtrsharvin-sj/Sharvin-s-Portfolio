import { projects } from './data/portfolio.js'
import social from './data/social.js'
import personalAchievements from './data/personalAchievements.js'
import './style/portfolio.css'

// Register matching navigation, preview and content elements before Menu is constructed.
export function setupPortfolio()
{
    const navigation = document.querySelector('.js-menu .js-navigation')
    navigation.querySelector('[data-name="achievements"]').setAttribute('aria-label', 'Achievements')
    navigation.querySelector('[data-name="achievements"]').setAttribute('title', 'Achievements')
    navigation.querySelector('[data-name="achievements"]').insertAdjacentHTML('beforebegin', '<button class="js-navigation-item item" data-name="personalAchievements" aria-label="My Achievements" title="My Achievements"><div class="button-inner"><div class="icon-container"><img src="ui/personal-achievements.svg" width="24" height="24" alt="" draggable="false"></div></div></button>')
    document.querySelector('.js-previews').insertAdjacentHTML('beforeend', '<div class="js-preview preview personalAchievements-preview"><img class="background" src="ui/previews/achievements.webp" alt="The achievement area in Sharvin’s portfolio" draggable="false"></div>')
    document.querySelector('.js-contents').insertAdjacentHTML('beforeend', '<div class="js-content content personalAchievements-content"><div class="content-inner"><h1 class="title">My Achievements</h1><p class="text">My awards and competition results.</p><div class="personal-achievements-list"></div></div></div>')
    const awardList = document.querySelector('.personal-achievements-list')
    for(const award of personalAchievements)
    {
        const card = document.createElement('article')
        card.className = 'project-card'
        const result = document.createElement('span')
        result.className = 'project-number'
        result.textContent = award.result
        const title = document.createElement('h2')
        title.textContent = award.title
        const stage = document.createElement('p')
        stage.textContent = award.stage
        card.append(result, title, stage)
        awardList.append(card)
    }
    navigation.insertAdjacentHTML('afterbegin', '<button class="js-navigation-item item projects-tab" data-name="projects" aria-label="My Projects" title="My Projects"><div class="button-inner"><div class="icon-container"><img src="ui/projects.svg" width="24" height="24" alt="" draggable="false"></div></div></button>')
    document.querySelector('.js-previews').insertAdjacentHTML('beforeend', '<div class="js-preview preview projects-preview"><img class="background" src="ui/previews/projects.png" alt="Sharvin’s project showcase in the 3D world" draggable="false"></div>')
    document.querySelector('.js-contents').insertAdjacentHTML('beforeend', '<div class="js-content content projects-content"><div class="content-inner"><div class="js-project-list"><h1 class="title">My Projects</h1><p class="text">AI, machine learning, software, and hardware experiments by Sharvin SJ.</p><div class="project-cards">' + projects.map((p, i) => '<article class="project-card" id="project-' + p.id + '"><span class="project-number">0' + (i + 1) + ' / ' + p.tag + '</span><h2>' + p.title + '</h2><p>' + p.description + '</p><button class="button" data-project-id="' + p.id + '">View project</button></article>').join('') + '</div></div><div class="js-project-detail" hidden><button class="button js-project-back">← All projects</button><h1 class="title js-project-title" tabindex="-1"></h1><p class="project-number js-project-tag"></p><h2>Overview</h2><p class="text js-project-description"></p><p class="text">By Sharvin SJ · AI / ML Engineer</p></div></div></div>')
    // Keep Home as the default tab.
    navigation.append(...Array.from(navigation.children).sort((a,b) => (a.dataset.name === 'home' ? -1 : b.dataset.name === 'home' ? 1 : 0)))
    const home = document.querySelector('.home-content .content-inner')
    home.insertAdjacentHTML('beforeend', '<button class="button js-portfolio-projects">My Projects</button><h2 class="title">Find me online</h2><div class="sharvin-socials">' + social.map(link => link.url ? '<a href="' + link.url + '" target="_blank" rel="noreferrer">' + link.name + ' ↗</a>' : '<span>Discord · sharvinsj</span>').join('') + '</div>')
    document.querySelector('.home-preview').innerHTML = '<img class="background" src="ui/previews/home.webp" alt="Sharvin’s rover in the interactive portfolio" draggable="false">'
    document.querySelectorAll('.js-navigation-item').forEach(el => { if(!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.dataset.name === 'behindTheScene' ? 'About Sharvin' : el.dataset.name) })
}
