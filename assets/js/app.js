const API_KEY = 'c60c30437c5347478f634124261708';
const API_URL = 'https://api.weatherapi.com/v1/current.json';

let buscando = false;

// ELEMENTOS DOM
const formBusca = document.getElementById('form-busca');
const inputCidade = document.getElementById('cidade-input');
const containerCards = document.getElementById('container-cards');
const statusMensagem = document.getElementById('status-mensagem');
const listaFavoritos = document.getElementById('lista-favoritos');
const mensagemInicial = document.getElementById('mensagem-inicial');

// TEMA
const headerNav = document.querySelector('header nav ul');
const toggleLi = document.createElement('li');
const toggleBtn = document.createElement('button');
toggleBtn.id = 'toggle-theme';
toggleBtn.setAttribute('aria-label', 'Alternar tema claro/escuro');
toggleBtn.textContent = '🌙';
toggleLi.appendChild(toggleBtn);
headerNav.appendChild(toggleLi);

function aplicarTema(tema) {
    if (tema === 'dark') {
        document.body.classList.add('dark-mode');
        toggleBtn.textContent = '☀️';
        localStorage.setItem('tema', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        toggleBtn.textContent = '🌙';
        localStorage.setItem('tema', 'light');
    }
}

function carregarTema() {
    const temaSalvo = localStorage.getItem('tema');
    if (temaSalvo) {
        aplicarTema(temaSalvo);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        aplicarTema('dark');
    } else {
        aplicarTema('light');
    }
}

toggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode');
    aplicarTema(isDark ? 'light' : 'dark');
});
carregarTema();

// FAVORITOS
let favoritos = [];

function carregarFavoritos() {
    const dados = localStorage.getItem('favoritos');
    favoritos = dados ? JSON.parse(dados) : [];
    renderizarFavoritos();
}

function salvarFavoritos() {
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
}

function adicionarFavorito(cidade) {
    if (!favoritos.includes(cidade)) {
        favoritos.push(cidade);
        salvarFavoritos();
        renderizarFavoritos();
    }
}

function removerFavorito(cidade) {
    favoritos = favoritos.filter(fav => fav !== cidade);
    salvarFavoritos();
    renderizarFavoritos();
}

function renderizarFavoritos() {
    if (favoritos.length === 0) {
        listaFavoritos.innerHTML = '<li class="empty-fav">Nenhuma cidade favorita ainda.</li>';
        return;
    }

    listaFavoritos.innerHTML = favoritos.map(cidade => `
        <li>
            ${cidade}
            <button data-cidade="${cidade}" aria-label="Remover ${cidade} dos favoritos">✕</button>
        </li>
    `).join('');

    listaFavoritos.querySelectorAll('button[data-cidade]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removerFavorito(btn.dataset.cidade);
        });
    });
}

// API
function atualizarCard(card, data) {
    const {
        location: { name, country, localtime },
        current: {
            temp_c,
            feelslike_c,
            condition: { text, icon },
            humidity,
            wind_kph,
            wind_dir,
            pressure_mb,
            uv,
            vis_km
        }
    } = data;

    // Formata hora local
    const hora = localtime ? localtime.split(' ')[1] : '';

    card.querySelector('.cidade').textContent = `${name}, ${country}`;
    card.querySelector('.hora-local').textContent = `🕐 ${hora || ''}`;
    card.querySelector('.icone img').src = `https:${icon}`;
    card.querySelector('.icone img').alt = text;
    card.querySelector('.temp').innerHTML = `${temp_c}°C <small>sens. ${feelslike_c}°</small>`;
    card.querySelector('.condicao').textContent = text;
    
    // Atualiza detalhes
    const detalhes = card.querySelectorAll('.detalhes-grid .item');
    if (detalhes.length >= 6) {
        detalhes[0].innerHTML = `<span class="label">💧</span> ${humidity}%`;
        detalhes[1].innerHTML = `<span class="label">💨</span> ${wind_kph} km/h ${wind_dir}`;
        detalhes[2].innerHTML = `<span class="label">📊</span> ${pressure_mb} hPa`;
        detalhes[3].innerHTML = `<span class="label">☀️</span> UV ${uv}`;
        detalhes[4].innerHTML = `<span class="label">👁️</span> ${vis_km} km`;
    }
}

async function buscarClima(cidade) {
    if (buscando) {
        exibirStatus('⏳ Aguarde a busca atual terminar.', 'warning');
        return;
    }

    const cards = document.querySelectorAll('.card-clima');
    let cardExistente = null;
    for (const card of cards) {
        if (card.dataset.cidade?.toLowerCase() === cidade.toLowerCase()) {
            cardExistente = card;
            break;
        }
    }

    if (cardExistente) {
        exibirStatus(`🔄 Atualizando ${cidade}...`, 'loading');
        try {
            buscando = true;
            const url = `${API_URL}?key=${API_KEY}&q=${encodeURIComponent(cidade)}&lang=pt`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Erro ao atualizar');
            const data = await response.json();
            atualizarCard(cardExistente, data);
            exibirStatus('✅ Atualizado!', 'success');
        } catch (error) {
            exibirStatus('❌ ' + error.message, 'error');
        } finally {
            buscando = false;
        }
        return;
    }

    try {
        buscando = true;
        exibirStatus('⏳ Buscando...', 'loading');
        mostrarSpinner(true);

        const url = `${API_URL}?key=${API_KEY}&q=${encodeURIComponent(cidade)}&lang=pt`;
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) throw new Error('Cidade não encontrada.');
            if (response.status === 401) throw new Error('Chave de API inválida.');
            throw new Error(`Erro ${response.status}`);
        }

        const data = await response.json();
        mostrarSpinner(false);
        exibirStatus('✅ Clima encontrado!', 'success');
        renderizarCard(data);
    } catch (error) {
        mostrarSpinner(false);
        exibirStatus('❌ ' + error.message, 'error');
        console.error(error);
    } finally {
        buscando = false;
    }
}

function renderizarCard(data) {
    const {
        location: { name, country, localtime },
        current: {
            temp_c,
            feelslike_c,
            condition: { text, icon },
            humidity,
            wind_kph,
            wind_dir,
            pressure_mb,
            uv,
            vis_km
        }
    } = data;

    const hora = localtime ? localtime.split(' ')[1] : '';

    const card = document.createElement('div');
    card.className = 'card-clima';
    card.dataset.cidade = name;

    card.innerHTML = `
        <div class="cidade">${name}, ${country}</div>
        <div class="hora-local">🕐 ${hora}</div>
        <div class="icone">
            <img src="https:${icon}" alt="${text}" loading="lazy">
        </div>
        <div class="temp">${temp_c}°C <small>sens. ${feelslike_c}°</small></div>
        <div class="condicao">${text}</div>
        <div class="detalhes-grid">
            <div class="item"><span class="label">💧</span> ${humidity}%</div>
            <div class="item"><span class="label">💨</span> ${wind_kph} km/h ${wind_dir}</div>
            <div class="item"><span class="label">📊</span> ${pressure_mb} hPa</div>
            <div class="item"><span class="label">☀️</span> UV ${uv}</div>
            <div class="item"><span class="label">👁️</span> ${vis_km} km</div>
        </div>
        <button class="btn-favorito" data-cidade="${name}" aria-label="Adicionar ${name} aos favoritos">
            ☆ Favoritar
        </button>
    `;

    const btnFav = card.querySelector('.btn-favorito');
    btnFav.addEventListener('click', () => {
        adicionarFavorito(name);
        btnFav.textContent = '⭐ Favoritado';
        btnFav.disabled = true;
    });

    if (mensagemInicial) mensagemInicial.remove();
    containerCards.appendChild(card);
}

function exibirStatus(mensagem, tipo = 'info') {
    statusMensagem.textContent = mensagem;
    statusMensagem.className = `status-${tipo}`;
    statusMensagem.style.display = 'block';
    if (tipo !== 'loading' && tipo !== 'error') {
        setTimeout(() => {
            if (statusMensagem.textContent === mensagem) {
                statusMensagem.textContent = '';
                statusMensagem.className = '';
                statusMensagem.style.display = 'none';
            }
        }, 5000);
    }
}

function mostrarSpinner(ativo) {
    let spinner = document.querySelector('.spinner');
    if (ativo) {
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.className = 'spinner';
            spinner.setAttribute('role', 'status');
            spinner.setAttribute('aria-label', 'Carregando...');
            containerCards.prepend(spinner);
        }
    } else {
        if (spinner) spinner.remove();
    }
}

// EVENTOS
formBusca.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (buscando) return;

    const cidade = inputCidade.value.trim();
    if (!cidade) {
        exibirStatus('⚠️ Digite o nome de uma cidade.', 'warning');
        return;
    }

    const btn = formBusca.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-text">Buscando...</span><span class="btn-icon">⏳</span>';

    await buscarClima(cidade);

    btn.disabled = false;
    btn.innerHTML = '<span class="btn-text">Buscar</span><span class="btn-icon">🔍</span>';
    inputCidade.value = '';
    inputCidade.focus();
});

// INICIALIZAÇÃO
carregarFavoritos();

// CLIQUE NOS FAVORITOS
listaFavoritos.addEventListener('click', (e) => {
    const item = e.target.closest('li');
    if (!item) return;
    if (e.target.tagName === 'BUTTON') return;
    const cidade = item.textContent.replace('✕', '').trim();
    if (cidade) buscarClima(cidade);
});

console.log('🌤️ AuraTemp Pro carregado!');