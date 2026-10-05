#!/usr/bin/env python3
"""
GPT-Sol / Microsoft Copilot Edge CDP Bridge CLI
Permite consultar o agente GPT-Sol no Microsoft 365 Copilot corporativo via automação de navegador (CDP na porta 9222).
"""

import argparse
import os
import sys
import time

CDP_URL_DEFAULT = "http://127.0.0.1:9222"
COPILOT_URL_SUBSTRING = "m365.cloud.microsoft/chat"


def get_playwright():
    try:
        from playwright.sync_api import sync_playwright
        return sync_playwright
    except ImportError:
        print("[ERRO] Playwright não está instalado. Instale com: pip install playwright && playwright install chromium", file=sys.stderr)
        sys.exit(1)


def connect_edge(p, cdp_url=CDP_URL_DEFAULT):
    try:
        browser = p.chromium.connect_over_cdp(cdp_url)
        context = browser.contexts[0]
        return browser, context
    except Exception as e:
        print(f"[ERRO] Não foi possível conectar ao Microsoft Edge na porta CDP ({cdp_url}).", file=sys.stderr)
        print(f"Certifique-se de que o Edge está rodando com: msedge.exe --remote-debugging-port=9222", file=sys.stderr)
        print(f"Detalhes: {e}", file=sys.stderr)
        sys.exit(1)


def find_copilot_page(context):
    # Procura aba que contenha o Copilot M365 ou Bing Chat
    for page in context.pages:
        url = page.url.lower()
        if "m365.cloud.microsoft/chat" in url or "copilot.microsoft.com" in url or "bing.com/chat" in url:
            return page
    # Se não encontrar, retorna a primeira página ou abre uma nova
    if len(context.pages) > 0:
        return context.pages[0]
    return context.new_page()


def wait_for_response(page, timeout_sec=120):
    """Aguarda a geração completa da resposta do Copilot (até o botão de parar sumir e o texto estabilizar)."""
    start_time = time.time()
    time.sleep(5)  # Breve pausa para o streaming começar

    while time.time() - start_time < timeout_sec:
        # Verifica se o botão de 'Parar' / 'Stop generating' ainda está presente
        stop_buttons = page.locator('button:has-text("Parar"), button[aria-label*="Stop"], button[title*="Parar"]').all()
        is_generating = any(btn.is_visible() for btn in stop_buttons if btn)

        if not is_generating:
            # Dá mais 2 segundos de confirmação de estabilidade
            time.sleep(2)
            stop_buttons_recheck = page.locator('button:has-text("Parar"), button[aria-label*="Stop"]').all()
            if not any(btn.is_visible() for btn in stop_buttons_recheck if btn):
                break
        time.sleep(2)


def extract_last_reply(page):
    """Extrai a resposta do assistente (GPT-Sol)."""
    # Tenta seletores de mensagens do assistente
    selectors = [
        '[data-message-author-role="assistant"]',
        '.prose',
        '.chat-message',
        '[data-testid*="bot-message"]',
        'div[class*="ChatMessage"]'
    ]
    for sel in selectors:
        elements = page.locator(sel).all()
        if elements:
            text = elements[-1].inner_text().strip()
            if text:
                return text

    # Fallback para o container principal ou corpo
    main = page.locator('main, [role="main"]').first
    if main.count() > 0:
        return main.inner_text().strip()
    return page.locator('body').inner_text().strip()


def send_prompt_to_copilot(page, prompt_text):
    # Procura textarea ou div contenteditable
    input_box = None
    for sel in ['textarea', '[contenteditable="true"]', '[role="textbox"]', 'div#userInput']:
        loc = page.locator(sel).first
        if loc.count() > 0 and loc.is_visible():
            input_box = loc
            break

    if not input_box:
        raise Exception("Campo de entrada de texto do Copilot não foi localizado na página.")

    input_box.click()
    time.sleep(0.3)
    input_box.fill(prompt_text)
    time.sleep(0.5)

    # Botão de envio
    send_btn = None
    for sel in ['button[aria-label*="Enviar"]', 'button[aria-label*="Submit"]', 'button[title*="Enviar"]', 'button[data-testid*="send"]']:
        btn = page.locator(sel).first
        if btn.count() > 0 and btn.is_visible():
            send_btn = btn
            break

    if send_btn:
        send_btn.click()
    else:
        page.keyboard.press("Enter")


def cmd_status(args):
    sync_playwright = get_playwright()
    with sync_playwright() as p:
        browser, context = connect_edge(p, args.cdp_url)
        print(f"[OK] Conectado ao Edge CDP em: {args.cdp_url}")
        print(f"Total de abas abertas: {len(context.pages)}")
        copilot_found = False
        for i, page in enumerate(context.pages):
            url = page.url
            title = page.title()
            is_copilot = ("m365.cloud.microsoft" in url) or ("copilot" in url.lower())
            flag = " [COPILOT/GPT-SOL]" if is_copilot else ""
            print(f"  [{i}] {title[:40]} -> {url[:60]}{flag}")
            if is_copilot:
                copilot_found = True

        if copilot_found:
            print("[OK] Sessão do Copilot / GPT-Sol identificada e pronta para consultas.")
        else:
            print("[AVISO] Nenhuma aba ativa do Copilot encontrada. Abra o chat do Copilot no Edge.")


def cmd_ask(args):
    sync_playwright = get_playwright()
    
    # Carrega prompt do argumento ou de arquivo
    if args.file:
        if not os.path.exists(args.file):
            print(f"[ERRO] Arquivo de prompt não encontrado: {args.file}", file=sys.stderr)
            sys.exit(1)
        with open(args.file, "r", encoding="utf-8") as f:
            prompt_content = f.read()
    elif args.prompt:
        prompt_content = args.prompt
    else:
        print("[ERRO] Informe --prompt 'seu texto' ou --file 'caminho/arquivo.txt'", file=sys.stderr)
        sys.exit(1)

    with sync_playwright() as p:
        browser, context = connect_edge(p, args.cdp_url)
        page = find_copilot_page(context)
        print(f"Conectado à página: {page.title()} ({page.url})")

        print("Enviando prompt ao Copilot / GPT-Sol...")
        send_prompt_to_copilot(page, prompt_content)

        print("Aguardando geração completa da resposta...")
        wait_for_response(page, timeout_sec=args.timeout)

        reply = extract_last_reply(page)
        print(f"Resposta recebida ({len(reply)} caracteres).")

        out_path = args.output
        if not out_path:
            out_path = "copilot_reply.md"

        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(reply)

        print(f"[SUCESSO] Resposta do GPT-Sol salva em: {os.path.abspath(out_path)}")


def cmd_diagnose(args):
    """Diagnostica logs de erro ou stack trace usando o GPT-Sol."""
    if not os.path.exists(args.log_file):
        print(f"[ERRO] Arquivo de log não encontrado: {args.log_file}", file=sys.stderr)
        sys.exit(1)

    with open(args.log_file, "r", encoding="utf-8", errors="ignore") as f:
        log_content = f.read()

    # Limita tamanho para não sobrecarregar
    if len(log_content) > 8000:
        log_content = log_content[-8000:]

    context_text = ""
    if args.context:
        context_text = f"\n\nContexto adicional do projeto:\n{args.context}"

    prompt = (
        "Você é um arquiteto especialista de software e engenharia de sistemas. "
        "Analise a seguinte stack trace / log de erro e forneça: "
        "1) A causa raiz exata do problema; "
        "2) A solução recomendada passo a passo; "
        "3) Os trechos de código/configuração corrigidos para aplicação imediata.\n\n"
        f"--- LOG DE ERRO ---\n{log_content}\n--- FIM DO LOG ---"
        f"{context_text}"
    )

    args.prompt = prompt
    args.file = None
    if not args.output:
        args.output = "diagnostico_gpt_sol.md"
    cmd_ask(args)


def main():
    parser = argparse.ArgumentParser(description="Ponte de automação para Microsoft Copilot / GPT-Sol via Edge CDP")
    parser.add_argument("--cdp-url", default=CDP_URL_DEFAULT, help="URL do Chrome DevTools Protocol do Edge (padrão: http://127.0.0.1:9222)")
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # Subcomando: status
    parser_status = subparsers.add_parser("status", help="Verifica a conexão com o Edge e localiza a aba do Copilot")

    # Subcomando: ask
    parser_ask = subparsers.add_parser("ask", help="Envia uma pergunta ou instrução ao GPT-Sol")
    parser_ask.add_argument("--prompt", "-p", help="Texto do prompt a ser enviado")
    parser_ask.add_argument("--file", "-f", help="Caminho para arquivo de texto contendo o prompt")
    parser_ask.add_argument("--output", "-o", default="copilot_reply.md", help="Arquivo de destino para salvar a resposta (Markdown)")
    parser_ask.add_argument("--timeout", type=int, default=120, help="Tempo máximo de espera em segundos")

    # Subcomando: diagnose
    parser_diag = subparsers.add_parser("diagnose", help="Diagnostica uma stack trace ou log de erro")
    parser_diag.add_argument("--log-file", "-l", required=True, help="Arquivo contendo o log de erro ou stack trace")
    parser_diag.add_argument("--context", "-c", help="Contexto adicional sobre o projeto ou tecnologia")
    parser_diag.add_argument("--output", "-o", default="diagnostico_gpt_sol.md", help="Arquivo de saída do diagnóstico")
    parser_diag.add_argument("--timeout", type=int, default=120, help="Tempo máximo de espera em segundos")

    args = parser.parse_args()

    if args.subcommand == "status":
        cmd_status(args)
    elif args.subcommand == "ask":
        cmd_ask(args)
    elif args.subcommand == "diagnose":
        cmd_diagnose(args)


if __name__ == "__main__":
    main()
