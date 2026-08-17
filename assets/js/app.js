// CONFIGURAÇÕES INICIAIS
const API_KEY = 'c60c30437c5347478f634124261708';
const API_URL = 'https://api.weatherapi.com/v1/current.json';

let buscando = false; 

// ELEMENTOS DO DOM
const formBusca = document.getElementById('form-busca');
const inputCidade = document.getElementById('cidade-input');
const containerCards = document.getElementById('container-cards');
const statusMensagem = document.getElementById('status-mensagem');
const listaFavoritos = document.getElementById('lista-favoritos');
const mensagemInicial = document.getElementById('mensagem-inicial');

// GERENCIAMENTO DE TEMA (DARK/LIGHT)

// Cria o botão de toggle dinamicamente
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

// GERENCIAMENTO DE FAVORITOS

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
        listaFavoritos.innerHTML = '<li>Nenhuma cidade favorita ainda.</li>';
        return;
    }

    listaFavoritos.innerHTML = favoritos.map(cidade => `
        <li>
            ${cidade}
            <button data-cidade="${cidade}" aria-label="Remover ${cidade} dos favoritos">✕</button>
        </li>
    `).join('');

    listaFavoritos.querySelectorAll('button[data-cidade]').forEach(btn => {
        btn.addEventListener('click', () => {
            removerFavorito(btn.dataset.cidade);
        });
    });
}

// FUNÇÕES DE API (FETCH)

// Atualiza um card existente com novos dados
function atualizarCard(card, data) {
    const {
        location: { name, country },
        current: {
            temp_c,
            condition: { text, icon },
            humidity,
            wind_kph
        }
    } = data;

    card.querySelector('.cidade').textContent = `${name}, ${country}`;
    card.querySelector('.icone img').src = `https:${icon}`;
    card.querySelector('.icone img').alt = text;
    card.querySelector('.temp').textContent = `${temp_c}°C`;
    card.querySelector('.condicao').textContent = text;
    card.querySelector('.detalhes span:first-child').textContent = `💧 ${humidity}%`;
    card.querySelector('.detalhes span:last-child').textContent = `💨 ${wind_kph} km/h`;
}

// Função principal de busca
async function buscarClima(cidade) {
    if (buscando) {
        exibirStatus('⏳ Aguarde a busca atual terminar.', 'warning');
        return;
    }

    // Verifica se já existe um card para essa cidade
    const cards = document.querySelectorAll('.card-clima');
    let cardExistente = null;
    for (const card of cards) {
        if (card.dataset.cidade?.toLowerCase() === cidade.toLowerCase()) {
            cardExistente = card;
            break;
        }
    }

    if (cardExistente) {
        exibirStatus(`🔄 Atualizando dados de ${cidade}...`, 'loading');
        try {
            buscando = true;
            const url = `${API_URL}?key=${API_KEY}&q=${encodeURIComponent(cidade)}&lang=pt`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Erro ao atualizar dados');
            const data = await response.json();
            atualizarCard(cardExistente, data);
            exibirStatus('✅ Dados atualizados!', 'success');
        } catch (error) {
            exibirStatus('❌ ' + error.message, 'error');
            console.error(error);
        } finally {
            buscando = false;
        }
        return;
    }

    try {
        buscando = true;
        exibirStatus('⏳ Buscando dados...', 'loading');
        mostrarSpinner(true);

        const url = `${API_URL}?key=${API_KEY}&q=${encodeURIComponent(cidade)}&lang=pt`;
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Cidade não encontrada. Verifique o nome e tente novamente.');
            } else if (response.status === 401) {
                throw new Error('Chave de API inválida. Verifique sua chave no WeatherAPI.');
            } else {
                throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
            }
        }

        const data = await response.json();
        mostrarSpinner(false);
        exibirStatus('✅ Clima encontrado!', 'success');
        renderizarCard(data);
        return data;

    } catch (error) {
        mostrarSpinner(false);
        exibirStatus(`❌ ${error.message}`, 'error');
        console.error('Erro ao buscar clima:', error);
    } finally {
        buscando = false;
    }
}

// FUNÇÕES DE RENDERIZAÇÃO

function renderizarCard(data) {
    const {
        location: { name, country },
        current: {
            temp_c,
            condition: { text, icon },
            humidity,
            wind_kph
        }
    } = data;

    const card = document.createElement('div');
    card.className = 'card-clima';
    card.dataset.cidade = name;

    card.innerHTML = `
        <div class="cidade">${name}, ${country}</div>
        <div class="icone">
            <img src="https:${icon}" alt="${text}" loading="lazy">
        </div>
        <div class="temp">${temp_c}°C</div>
        <div class="condicao">${text}</div>
        <div class="detalhes">
            <span>💧 ${humidity}%</span>
            <span>💨 ${wind_kph} km/h</span>
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
        btnFav.style.opacity = '0.7';
        btnFav.style.cursor = 'default';
    });

    if (mensagemInicial) {
        mensagemInicial.remove();
    }

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

// O evento submit é o único responsável pela busca.
// O Enter dentro do input já dispara o submit nativamente.
formBusca.addEventListener('submit', async (e) => {
    // Impede o recarregamento da página
    e.preventDefault();

    if (buscando) return;

    const cidade = inputCidade.value.trim();
    if (!cidade) {
        exibirStatus('⚠️ Por favor, digite o nome de uma cidade.', 'warning');
        return;
    }

    // BLOQUEIO IMEDIATO
    buscando = true;
    const btn = formBusca.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '⏳ Buscando...';

    // Executa a busca
    await buscarClima(cidade);

    // LIBERA 
    buscando = false;
    btn.disabled = false;
    btn.textContent = '🔍 Buscar';
    inputCidade.value = '';
    inputCidade.focus();
});

// INICIALIZAÇÃO

carregarFavoritos();

// CLICAR NA CIDADE FAVORITA PARA BUSCAR

listaFavoritos.addEventListener('click', (e) => {
    const item = e.target.closest('li');
    if (!item) return;
    if (e.target.tagName === 'BUTTON') return;

    const cidade = item.textContent.replace('✕', '').trim();
    if (cidade) {
        buscarClima(cidade);
    }
});

console.log('🌤️ AuraTemp carregado com sucesso!');
console.log('💡 Dica: Busque por cidades e adicione aos favoritos.');