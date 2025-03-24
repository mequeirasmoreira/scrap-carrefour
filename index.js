const puppeteer = require('puppeteer');
const fs = require('fs');

const url = 'https://mercado.carrefour.com.br/bebidas'; // Página especifica da página de bebidas
const cep = '13403130'; // CEP da própria LOJA

// Debugger
const logger = {
    debug: (message) => console.log(`[DEBUG] ${message}`),
    info: (message) => console.log(`[INFO] ${message}`),
    warn: (message) => console.log(`[AVISO] ${message}`),
    error: (message) => console.log(`[ERRO] ${message}`)
};

(async () => {
    logger.info("Start");
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: false, // Mudando para false para visualizar o processo
            defaultViewport: null, // Viewport automático
            args: ['--start-maximized'] // Iniciar maximizado
        });
        const page = await browser.newPage();

        // Configurar timeout de navegação maior
        page.setDefaultNavigationTimeout(60000);

        logger.debug(`Pagina atual - ${url}`);
        await page.goto(url, {
            waitUntil: 'networkidle2'
        });

        // Aguardar carregamento da página
        logger.debug("Aguardando carregamento completo da página");

        // Substituindo waitForTimeout por uma alternativa compatível
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

        // 1. Define o CEP de Piracicaba
        const botaoCEPClicado = await page.evaluate(() => {
            const botoes = Array.from(document.querySelectorAll('button'));
            const botaoCEP = botoes.find(b =>
                b.innerText && b.innerText.includes('Insira seu CEP') ||
                b.title && b.title.includes('Insira seu CEP')
            );

            if (botaoCEP) {
                botaoCEP.click();
                return true;
            }

            return false;
        });

        if (botaoCEPClicado) {
            logger.info("Botão de CEP encontrado");
        } else {
            logger.warn("Botão de CEP não encontrado");

            // Tenta clicar no botão usando o seletor específico
            try {
                await page.click('button.w-[max-content].cusror-pointer.flex.col-span-2.font-bold.hover\\:underline.hover\\:underline-offset-2[title="Insira seu CEP"]');
                logger.info("Botão de CEP encontrado via seletor específico");
            } catch (error) {
                logger.error(`Erro ao clicar no botão de CEP: ${error.message}`);

                // Última tentativa: clicar em qualquer elemento que pareça ser o botão de CEP
                const clicouAlternativo = await page.evaluate(() => {
                    // Procurar por elementos que contenham "CEP" no texto
                    const elementos = Array.from(document.querySelectorAll('*'));
                    const elementosCEP = elementos.filter(el =>
                        el.innerText && el.innerText.includes('CEP') &&
                        (el.tagName === 'BUTTON' || el.tagName === 'A' || el.onclick)
                    );

                    if (elementosCEP.length > 0) {
                        logger.info("Elemento alternativo de CEP encontrado");
                        elementosCEP[0].click();
                        return true;
                    }

                    return false;
                });

                if (clicouAlternativo) {
                    logger.info("Elemento alternativo de CEP encontrado");
                } else {
                    logger.error("Não foi possível encontrar o botão de CEP");
                    throw new Error("Não foi possível encontrar o botão de CEP");
                }
            }
        }

        // Aguardar o modal de CEP aparecer
        logger.debug("Aguardando modal de CEP");
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

        // Tentar fechar o botão de chat se ele estiver visível
        logger.debug("Tentando ocultar o botão de chat");
        try {
            const chatButtonHidden = await page.evaluate(() => {
                // Procurar pelo botão de chat
                const chatButton = document.querySelector('button.flex.items-center.justify-center.w-\\[110px\\].h-\\[110px\\].bottom-10.right-10.rounded-full.bg-orange.fixed.z-10');

                if (chatButton) {
                    logger.info("Botão de chat encontrado, ocultando");

                    // Apenas ocultar o botão em vez de removê-lo
                    chatButton.style.display = 'none';
                    chatButton.style.visibility = 'hidden';
                    chatButton.style.pointerEvents = 'none'; // Impede interações com o botão

                    return true;
                }

                // Procurar por qualquer botão com imagem que contenha "Chat" no alt
                const chatButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                    const img = btn.querySelector('img[alt="Chat"]');
                    return img !== null;
                });

                if (chatButtons.length > 0) {
                    logger.info("Botão de chat encontrado por imagem, ocultando");
                    chatButtons.forEach(btn => {
                        btn.style.display = 'none';
                        btn.style.visibility = 'hidden';
                        btn.style.pointerEvents = 'none';
                    });
                    return true;
                }

                // Procurar por qualquer elemento fixo no canto inferior direito
                const fixedElements = Array.from(document.querySelectorAll('.fixed')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return (style.bottom === '10px' || style.bottom === '2.5rem') &&
                        (style.right === '10px' || style.right === '2.5rem');
                });

                if (fixedElements.length > 0) {
                    logger.info("Elementos fixos encontrados no canto inferior direito, ocultando");
                    fixedElements.forEach(el => {
                        el.style.display = 'none';
                        el.style.visibility = 'hidden';
                        el.style.pointerEvents = 'none';
                    });
                    return true;
                }

                return false;
            });

            if (chatButtonHidden) {
                logger.info("Botão de chat ocultado com sucesso");
            } else {
                logger.info("Botão de chat não encontrado");
            }
        } catch (error) {
            logger.error(`Erro ao tentar ocultar o botão de chat: ${error.message}`);
        }

        // Procurar o campo de input para o CEP
        logger.debug("Procurando campo de input para CEP");

        // Tentar encontrar o campo de input por seletor específico
        let inputCEPEncontrado = false;

        try {
            // Esperar pelo campo de input
            await page.waitForSelector('input[type="search"][name="zipcode"][placeholder="00000-000"]', {
                timeout: 5000
            });

            // Digitar o CEP
            await page.type('input[type="search"][name="zipcode"][placeholder="00000-000"]', cep);

            logger.info("Campo de input para CEP encontrado");
            inputCEPEncontrado = true;
        } catch (error) {
            logger.warn(`Erro ao encontrar campo de input por seletor específico: ${error.message}`);

            // Tentar encontrar por atributos parciais
            try {
                const inputCEP = await page.evaluate(() => {
                    // Procurar por inputs que pareçam ser para CEP
                    const inputs = Array.from(document.querySelectorAll('input[type="search"], input[placeholder*="000"]'));
                    const inputCEP = inputs.find(input =>
                        input.name === 'zipcode' ||
                        input.placeholder.includes('000') ||
                        input.id.toLowerCase().includes('cep') ||
                        input.className.toLowerCase().includes('cep')
                    );

                    if (inputCEP) {
                        logger.info("Campo de input para CEP encontrado por atributos parciais");
                        inputCEP.value = cep;
                        return true;
                    }

                    return false;
                });

                if (inputCEP) {
                    logger.info("Campo de input para CEP encontrado por atributos parciais");
                    inputCEPEncontrado = true;
                }
            } catch (inputError) {
                logger.error(`Erro ao encontrar campo de input por atributos parciais: ${inputError.message}`);
            }
        }

        if (!inputCEPEncontrado) {
            logger.error("Não foi possível encontrar o campo de input para CEP");
            throw new Error("Não foi possível encontrar o campo de input para CEP");
        }

        logger.debug(`CEP digitado: ${cep}`);

        // Procurar o botão de buscar/confirmar
        logger.debug("Procurando botão de buscar/confirmar");

        // Tentar clicar no botão de buscar usando o seletor específico
        let botaoBuscarClicado = false;

        try {
            // Esperar pelo botão
            await page.waitForSelector('button[type="submit"].bg-blue-primary.hover\\:bg-blue-primaryHover.active\\:bg-blue-primaryActive.text-white.text-sm.py-2.px-4.rounded-r-md.w-\\[117px\\].min-w-\\[117px\\]', {
                timeout: 5000
            });

            // Clicar no botão
            await page.click('button[type="submit"].bg-blue-primary.hover\\:bg-blue-primaryHover.active\\:bg-blue-primaryActive.text-white.text-sm.py-2.px-4.rounded-r-md.w-\\[117px\\].min-w-\\[117px\\]');

            logger.info("Botão de buscar/confirmar encontrado e clicado");
            botaoBuscarClicado = true;
        } catch (error) {
            logger.warn(`Erro ao clicar no botão de buscar por seletor específico: ${error.message}`);

            // Tentar encontrar por texto ou atributos parciais
            try {
                const clicouBotaoBuscar = await page.evaluate(() => {
                    // Procurar por botões que pareçam ser para buscar/confirmar
                    const botoes = Array.from(document.querySelectorAll('button[type="submit"], button.bg-blue-primary, button'));
                    const botaoBuscar = botoes.find(btn =>
                        btn.innerText && (
                            btn.innerText.toLowerCase().includes('buscar') ||
                            btn.innerText.toLowerCase().includes('confirmar') ||
                            btn.innerText.toLowerCase().includes('ok')
                        )
                    );

                    if (botaoBuscar) {
                        logger.info("Botão de buscar/confirmar encontrado por texto, clicando");
                        botaoBuscar.click();
                        return true;
                    }

                    return false;
                });

                if (clicouBotaoBuscar) {
                    logger.info("Botão de buscar/confirmar encontrado e clicado via JavaScript");
                    botaoBuscarClicado = true;
                }
            } catch (btnError) {
                logger.error(`Erro ao encontrar botão de buscar por texto: ${btnError.message}`);
            }
        }

        if (!botaoBuscarClicado) {
            logger.error("Não foi possível encontrar o botão de buscar/confirmar");
            throw new Error("Não foi possível encontrar o botão de buscar/confirmar");
        }

        // Aguardar a atualização do CEP
        logger.debug("Aguardando atualização do CEP");
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));



        // 2. Recarrega a página após definir o CEP
        logger.debug(`Recarregando a página: ${url}`);
        await page.goto(url, {
            waitUntil: 'networkidle2'
        });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

        // 3. Configura para exibir 60 produtos por página e navega por todas as páginas
        logger.debug("Configurando para exibir 60 produtos por página");



        // Tenta clicar no botão para alterar o número de produtos por página usando JavaScript
        try {
            // Primeiro, vamos verificar se o botão existe usando JavaScript
            const botaoExibicaoExiste = await page.evaluate(() => {
                // Procurar por qualquer botão que contenha o texto "produtos por página"
                const botoes = Array.from(document.querySelectorAll('button'));
                const botaoExibicao = botoes.find(b =>
                    b.innerText && b.innerText.includes('produtos por página')
                );

                if (botaoExibicao) {
                    logger.debug("Botão de exibição encontrado por texto:", botaoExibicao.innerText);
                    return true;
                }

                return false;
            });

            if (botaoExibicaoExiste) {
                logger.debug("Botão de exibição encontrado, tentando clicar");

                // Clicar no botão usando JavaScript
                await page.evaluate(() => {
                    const botoes = Array.from(document.querySelectorAll('button'));
                    const botaoExibicao = botoes.find(b =>
                        b.innerText && b.innerText.includes('produtos por página')
                    );

                    if (botaoExibicao) {
                        logger.debug("Clicando no botão de exibição");
                        botaoExibicao.click();
                        return true;
                    }

                    return false;
                });

                // Aguardar um pouco para o menu abrir
                await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

                // Agora tentar clicar no botão para 60 produtos
                const clicouBotao60 = await page.evaluate(() => {
                    // Procurar por qualquer botão que contenha exatamente o texto "60"
                    const botoes = Array.from(document.querySelectorAll('button'))
                        .filter(b => /^\d+$/.test(b.textContent.trim()));
                    const botao60 = botoes.find(b =>
                        b.innerText && b.innerText.trim() === '60'
                    );

                    if (botao60) {
                        logger.debug("Botão para 60 produtos encontrado, clicando");
                        botao60.click();
                        return true;
                    }

                    return false;
                });

                if (clicouBotao60) {
                    logger.info("Configurado para exibir 60 produtos por página");
                    // Aguardar a página recarregar
                    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
                } else {
                    logger.warn("Botão para 60 produtos não encontrado");
                }
            } else {
                logger.warn("Botão de exibição não encontrado");
            }
        } catch (error) {
            logger.error(`Erro ao configurar paginação: ${error.message}`);
        }

        // Determinar o número total de páginas
        logger.debug("Determinando o número total de páginas");
        let totalPages = 1; // Valor padrão

        try {

            totalPages = await page.evaluate(() => {
                logger.debug("Buscando número total de páginas");

                // Método 1: Procurar por texto que indica o total de páginas
                const textosPagina = Array.from(document.querySelectorAll('*')).map(el => el.textContent);
                for (const texto of textosPagina) {
                    // Procurar por padrões como "Página 1 de 23" ou "1-60 de 1380 produtos"
                    const matchPaginas = texto.match(/de\s+(\d+)\s+páginas/i) ||
                        texto.match(/página\s+\d+\s+de\s+(\d+)/i);

                    if (matchPaginas && matchPaginas[1]) {
                        const numeroPaginas = parseInt(matchPaginas[1], 10);
                        if (!isNaN(numeroPaginas) && numeroPaginas > 0) {
                            logger.debug(`Encontrado texto indicando ${numeroPaginas} páginas`);
                            return numeroPaginas;
                        }
                    }

                    // Procurar por padrões que indicam o número total de produtos
                    const matchProdutos = texto.match(/de\s+(\d+)\s+produtos/i) ||
                        texto.match(/(\d+)\s+produtos/i);

                    if (matchProdutos && matchProdutos[1]) {
                        const totalProdutos = parseInt(matchProdutos[1], 10);
                        if (!isNaN(totalProdutos) && totalProdutos > 0) {
                            // Estimar o número de páginas com base no total de produtos (assumindo 60 por página)
                            const paginasEstimadas = Math.ceil(totalProdutos / 60);
                            logger.debug(`Estimado ${paginasEstimadas} páginas baseado em ${totalProdutos} produtos`);
                            return paginasEstimadas;
                        }
                    }
                }

                // Método 2: Verificar se há um seletor de página específico
                const paginationContainer = document.querySelector('[data-testid="pagination"]') ||
                    document.querySelector('.pagination') ||
                    document.querySelector('[class*="pagination"]');

                if (paginationContainer) {
                    logger.debug("Container de paginação encontrado");

                    // Procurar por botões de página
                    const paginationButtons = Array.from(paginationContainer.querySelectorAll('button'))
                        .filter(b => /^\d+$/.test(b.textContent.trim()));

                    if (paginationButtons.length > 0) {
                        // Pegar o maior número de página
                        const pageNumbers = paginationButtons.map(b => parseInt(b.textContent.trim(), 10))
                            .filter(num => !isNaN(num));

                        if (pageNumbers.length > 0) {
                            const maxPage = Math.max(...pageNumbers);
                            logger.debug(`Maior número de página encontrado: ${maxPage}`);
                            return maxPage;
                        }
                    }
                }

                // Método 3: Procurar por links de paginação
                const paginationLinks = document.querySelectorAll('a[href*="page="]');
                logger.debug(`Encontrados ${paginationLinks.length} links de paginação`);

                if (paginationLinks.length > 0) {
                    // Extrair os números de página de todos os links
                    const pageNumbers = [];

                    paginationLinks.forEach(link => {
                        const match = link.href.match(/page=(\d+)/);
                        if (match && match[1]) {
                            const pageNum = parseInt(match[1], 10);
                            if (!isNaN(pageNum)) {
                                pageNumbers.push(pageNum);
                            }
                        }
                    });

                    if (pageNumbers.length > 0) {
                        const maxPage = Math.max(...pageNumbers);
                        logger.debug(`Maior número de página encontrado nos links: ${maxPage}`);
                        return maxPage;
                    }
                }

                // Método 4: Procurar por botões de paginação
                const allButtons = Array.from(document.querySelectorAll('button'));
                const paginationButtons = allButtons.filter(b => /^\d+$/.test(b.textContent.trim()));

                logger.debug(`Encontrados ${paginationButtons.length} botões de paginação`);

                if (paginationButtons.length > 0) {
                    // Extrair os números de página de todos os botões
                    const pageNumbers = paginationButtons
                        .map(b => parseInt(b.textContent.trim(), 10))
                        .filter(num => !isNaN(num));

                    if (pageNumbers.length > 0) {
                        const maxPage = Math.max(...pageNumbers);
                        logger.debug(`Maior número de página encontrado nos botões: ${maxPage}`);
                        return maxPage;
                    }
                }

                // Método 5: Verificar se há um botão "Próxima página" ou "Última página"
                const nextButtons = allButtons.filter(b =>
                    b.textContent.toLowerCase().includes('próxima') ||
                    b.textContent.toLowerCase().includes('próximo') ||
                    b.textContent.toLowerCase().includes('última') ||
                    b.textContent.toLowerCase().includes('ultimo')
                );

                if (nextButtons.length > 0) {
                    logger.debug("Botão de próxima/última página encontrado");
                    return 23;
                }

                logger.debug("Nenhum indicador de paginação encontrado, definindo para 23 páginas");
                return 23;
            });

        } catch (error) {
            logger.error(`[Main] - pagination - Erro ao determinar número de páginas: ${error.message}`);
            totalPages = 23;
        }

        logger.info(`Total de páginas: ${totalPages}`);

        // Coleta produtos de todas as páginas
        const allProducts = [];
        const pageResults = [];

        for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
            logger.info(`Processando página ${currentPage} de ${totalPages}`);

            // Se não for a primeira página, navegar para a página
            if (currentPage > 1) {
                const nextPageUrl = `${url}?page=${currentPage}`;
                logger.debug(`Navegando para a página: ${nextPageUrl}`);

                await page.goto(nextPageUrl, {
                    waitUntil: 'networkidle2'
                });
                await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
            }

            // Coleta os produtos da página atual
            logger.debug(`Iniciando coleta de produtos da página ${currentPage}`);

            const products = await page.evaluate(() => {
                // Esta função é executada no contexto do navegador, então não temos acesso ao logger aqui
                logger.debug(`Iniciando coleta de produtos`);

                // Tentar vários seletores para encontrar os produtos
                const seletoresProdutos = [
                    '[data-testid="product-card-container"]',
                    '.product-card',
                    '.product-item',
                    '[data-testid*="product"]',
                    '.vtex-search-result-3-x-galleryItem',
                    '.vtex-product-summary-2-x-container',
                    '.shelf-item',
                    // Seletores mais genéricos
                    'article',
                    '.col-span-1'
                ];

                let items = [];

                // Tentar cada seletor até encontrar produtos
                for (const seletor of seletoresProdutos) {
                    const elementos = document.querySelectorAll(seletor);
                    logger.debug(`Seletor ${seletor} encontrou ${elementos.length} itens`);

                    if (elementos.length > 0) {
                        items = elementos;
                        logger.debug(`Usando seletor: ${seletor}`);
                        break;
                    }
                }

                // Se ainda não encontrou nada, procurar especificamente pelos links de produtos
                if (items.length === 0) {
                    logger.debug(`Tentando encontrar produtos pelos links`);
                    const produtoLinks = document.querySelectorAll('a[data-testid="product-link"]');

                    if (produtoLinks.length > 0) {
                        logger.debug(`Encontrados ${produtoLinks.length} links de produtos`);

                        // Para cada link, encontrar o elemento pai que contém o produto completo
                        items = Array.from(produtoLinks).map(link => {
                            // Subir na árvore DOM até encontrar um elemento que pareça ser o card do produto
                            let parent = link.parentElement;
                            for (let i = 0; i < 5; i++) { // Limitar a 5 níveis para evitar problemas
                                if (parent && (parent.tagName === 'ARTICLE' ||
                                        parent.tagName === 'DIV' && parent.offsetWidth > 100)) {
                                    return parent;
                                }
                                if (parent) parent = parent.parentElement;
                            }
                            // Se não encontrou um pai adequado, retornar o próprio link
                            return link;
                        });
                    }
                }

                // Se ainda não encontrou nada
                if (items.length === 0) {
                    logger.debug(`Tentando abordagem genérica para encontrar produtos`);

                    // Procurar por elementos que pareçam ser cards de produtos
                    const candidatos = document.querySelectorAll('div, li, article');

                    items = Array.from(candidatos).filter(el => {
                        const texto = el.innerText.trim();
                        return texto.length > 5 && texto.length < 100 && !texto.includes('R$');
                    });

                    logger.debug(`Abordagem genérica encontrou ${items.length} possíveis produtos`);
                }

                // Função para extrair texto limpo
                const extrairTexto = (elemento) => {
                    if (!elemento) return null;
                    return elemento.innerText.trim().replace(/\s+/g, ' ');
                };

                // Função para extrair preço
                const extrairPreco = (elemento) => {
                    if (!elemento) return null;

                    // Tentar extrair o preço do texto do elemento
                    const texto = elemento.innerText;
                    const match = texto.match(/R\$\s*(\d+[\.,]\d{2})/);
                    if (match) return match[0];

                    return texto.trim();
                };

                const data = [];
                let missingTitleCount = 0;
                let missingPriceCount = 0;
                let missingLinkCount = 0;
                let completeProductCount = 0;

                // Contador global para IDs únicos
                let productIdCounter = 0;

                logger.debug(`Total de itens encontrados: ${items.length}`);

                // Imprimir o HTML de um item para debug
                if (items.length > 0) {
                    logger.debug(`Exemplo de HTML de um item: ${items[0].outerHTML.substring(0, 300)}...`);
                }

                Array.from(items).forEach((item, index) => {
                    // Usar o seletor exato para o título com base no exemplo fornecido
                    let titleElement = item.querySelector('a[data-testid="product-link"]');

                    // Se não encontrou com o seletor exato, tentar alternativas
                    if (!titleElement) {
                        const titleSelectors = [
                            'a[href*="/p"]',
                            'a.after\\:content-\\[\\\'\\\'\\]',
                            '[data-testid="product-card-name"]',
                            '[data-testid="product-title"]',
                            '.product-name',
                            '.product-title',
                            'h3',
                            'h2',
                            'a',
                            '.vtex-product-summary-2-x-productNameContainer',
                            '.vtex-product-summary-2-x-productBrandName'
                        ];

                        for (const selector of titleSelectors) {
                            const element = item.querySelector(selector);
                            if (element) {
                                titleElement = element;
                                break;
                            }
                        }
                    }

                    // Se não encontrou com seletores, procurar qualquer elemento com texto que pareça um título
                    if (!titleElement) {
                        const possiveisTitulos = Array.from(item.querySelectorAll('*')).filter(el => {
                            const texto = el.innerText.trim();
                            return texto.length > 5 && texto.length < 100 && !texto.includes('R$');
                        });

                        if (possiveisTitulos.length > 0) {
                            // Pegar o elemento com texto mais curto, provavelmente é o título
                            titleElement = possiveisTitulos.sort((a, b) =>
                                a.innerText.length - b.innerText.length
                            )[0];
                        }
                    }

                    let priceElement = item.querySelector('span[data-test-id="price"].text-blue-royal:not(.line-through)');

                    if (!priceElement) {
                        priceElement = item.querySelector('span[data-test-id="price"]:not(.line-through)');
                    }

                    if (!priceElement) {
                        const priceSelectors = [
                            'span[data-test-id="price"].text-blue-royal',
                            'span[data-test-id="price"].font-medium',
                            '[data-value]:not(.line-through)',
                            '[data-testid="price"]:not(.line-through)',
                            '.text-blue-royal:not(.line-through)',
                            '.product-price:not(.line-through)',
                            '.price:not(.line-through)',
                            '.best-price:not(.line-through)',
                            '.vtex-product-price-1-x-sellingPrice',
                            '.vtex-product-price-1-x-sellingPriceValue',
                            '*[class*="price"]:not(.line-through)'
                        ];

                        for (const selector of priceSelectors) {
                            const element = item.querySelector(selector);
                            if (element) {
                                priceElement = element;
                                break;
                            }
                        }
                    }

                    if (!priceElement) {
                        const possiveisPrecos = Array.from(item.querySelectorAll('*')).filter(el => {
                            const texto = el.innerText.trim();
                            const temFormatoPreco = texto.match(/R\$\s*\d+[\.,]\d{2}/) !== null;
                            const naoEstaRiscado = !el.classList.contains('line-through');
                            return temFormatoPreco && naoEstaRiscado;
                        });

                        if (possiveisPrecos.length > 0) {
                            priceElement = possiveisPrecos[0];
                        }
                    }

                    let linkElement = titleElement && titleElement.tagName === 'A' ? titleElement : item.querySelector('a');

                    const title = titleElement ? extrairTexto(titleElement) : null;
                    const priceWhole = priceElement ? extrairPreco(priceElement) : null;
                    const link = linkElement ? linkElement.href : null;

                    if (!titleElement) {
                        logger.debug(`Produto #${index+1}: Seletor de título não encontrado`);
                        missingTitleCount++;
                    }
                    if (!priceElement) {
                        logger.debug(`Produto #${index+1}: Seletor de preço não encontrado`);
                        missingPriceCount++;
                    }
                    if (!linkElement) {
                        logger.debug(`Produto #${index+1}: Seletor de link não encontrado`);
                        missingLinkCount++;
                    }

                    if (title && priceWhole) {
                        // Gerar um ID único numérico sequencial
                        productIdCounter++;

                        data.push({
                            id: productIdCounter,
                            title,
                            price: priceWhole,
                            link
                        });
                        completeProductCount++;
                        logger.debug(`Produto #${index+1}: ${title} - ${priceWhole}`);
                    } else {
                        logger.debug(`Produto #${index+1}: Informações incompletas - Título: ${!!title}, Preço: ${!!priceWhole}, Link: ${!!link}`);
                    }
                });

                logger.debug(`Estatísticas de coleta:
                - Produtos com título ausente: ${missingTitleCount}
                - Produtos com preço ausente: ${missingPriceCount}
                - Produtos com link ausente: ${missingLinkCount}
                - Produtos completos coletados: ${completeProductCount}`);

                return {
                    data,
                    stats: {
                        total: items.length,
                        missingTitle: missingTitleCount,
                        missingPrice: missingPriceCount,
                        missingLink: missingLinkCount,
                        complete: completeProductCount
                    }
                };
            });

            allProducts.push(...products.data);
            pageResults.push(products);
        }

        // Salva os dados no arquivo output.json
        logger.debug(`[Main] - saveData - Salvando ${allProducts.length} produtos`);
        fs.writeFileSync('output.json', JSON.stringify(allProducts, null, 2), 'utf-8');

        // Salva estatísticas
        logger.debug("[Main] - saveStats - Salvando estatísticas");

        // Calcular estatísticas totais
        const totalStats = {
            total: 0,
            missingTitle: 0,
            missingPrice: 0,
            missingLink: 0,
            complete: 0
        };

        // Somar estatísticas de todas as páginas
        pageResults.forEach(pageResult => {
            totalStats.total += pageResult.stats.total;
            totalStats.missingTitle += pageResult.stats.missingTitle;
            totalStats.missingPrice += pageResult.stats.missingPrice;
            totalStats.missingLink += pageResult.stats.missingLink;
            totalStats.complete += pageResult.stats.complete;
        });

        fs.writeFileSync('stats.json', JSON.stringify(totalStats, null, 2), 'utf-8');

        logger.debug(`Coleta concluída: ${allProducts.length} produtos coletados`);
        logger.debug(`Estatísticas:
        - Total de produtos encontrados: ${totalStats.total}
        - Produtos com título ausente: ${totalStats.missingTitle}
        - Produtos com preço ausente: ${totalStats.missingPrice}
        - Produtos com link ausente: ${totalStats.missingLink}
        - Produtos completos coletados: ${totalStats.complete}`);

    } catch (error) {
        logger.error(`Erro durante a execução: ${error.message}`);
        logger.error(error.stack);
    } finally {
        if (browser) {
            logger.debug("[Main] - close - Fechando o navegador");
            await browser.close();
        }
    }
})();