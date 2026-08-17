const API_KEY = 'c60c30437c5347478f634124261708'; 

const API_URL = 'https://api.weatherapi.com/v1/current.json';

// ELEMENTOS DO DOM
const formBusca = document.getElementById('form-busca');
const inputCidade = document.getElementById('cidade-input');
const containerCards = document.getElementById('container-cards');
const statusMensagem = document.getElementById('status-mensagem');
const listaFavoritos = document.getElementById('lista-favoritos');
const mensagemInicial = document.getElementById('mensagem-inicial');

// GERENCIAMENTO DE TEMA (DARK/LIGHT)

// Cria o botão de toggle dinamicamente (já que não estava no HTML)
const headerNav = document.querySelector('header nav ul');
const toggleLi = document.createElement('li');
const toggleBtn = document.createElement('button');
toggleBtn.id = 'toggle-theme';
toggleBtn.setAttribute('aria-label', 'Alternar tema claro/escuro');
toggleBtn.textContent = '🌙'; 
toggleLi.appendChild(toggleBtn);
headerNav.appendChild(toggleLi);

// Função para aplicar o tema
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

// Carrega o tema salvo ou detecta preferência do sistema
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

// Alterna o tema ao clicar no botão
toggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode');
    aplicarTema(isDark ? 'light' : 'dark');
});

// Inicializa o tema
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

    // Adiciona eventos de remoção
    listaFavoritos.querySelectorAll('button[data-cidade]').forEach(btn => {
        btn.addEventListener('click', () => {
            removerFavorito(btn.dataset.cidade);
        });
    });
}

// FUNÇÕES DE API (FETCH)

async function buscarClima(cidade) {
    const cardsExistentes = document.querySelectorAll('.card-clima');
    for (const card of cardsExistentes) {
        if (card.dataset.cidade?.toLowerCase() === cidade.toLowerCase()) {
            exibirStatus('⚠️ Esta cidade já está na lista.', 'warning');
            return;
        }
    }

    try {
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

    // Cria o card com Template Literals
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

    // Botão de favoritar
    const btnFav = card.querySelector('.btn-favorito');
    btnFav.addEventListener('click', () => {
        adicionarFavorito(name);
        btnFav.textContent = '⭐ Favoritado';
        btnFav.disabled = true;
        btnFav.style.opacity = '0.7';
        btnFav.style.cursor = 'default';
    });

    // Remove a mensagem inicial se existir
    if (mensagemInicial) {
        mensagemInicial.remove();
    }

    containerCards.appendChild(card);
}

function exibirStatus(mensagem, tipo = 'info') {
    statusMensagem.textContent = mensagem;
    statusMensagem.className = `status-${tipo}`;
    statusMensagem.style.display = 'block';

    // Limpa a mensagem após 5 segundos (exceto loading/error)
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

// Busca ao submeter o formulário
formBusca.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const cidade = inputCidade.value.trim();
    if (!cidade) {
        exibirStatus('⚠️ Por favor, digite o nome de uma cidade.', 'warning');
        return;
    }

    await buscarClima(cidade);
    inputCidade.value = ''; 
    inputCidade.focus();
});

// Permite buscar com Enter
inputCidade.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        formBusca.dispatchEvent(new Event('submit'));
    }
});

// INICIALIZAÇÃO

carregarFavoritos();

// RECUPERAR FAVORITOS AO CLICAR

// Adiciona evento de clique nos itens da lista de favoritos
// para buscar o clima da cidade favoritada
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