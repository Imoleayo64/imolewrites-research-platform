import re
from bs4 import BeautifulSoup

def html_to_latex(html_content: str, title: str) -> str:
    if not html_content:
        html_content = ""
        
    soup = BeautifulSoup(html_content, 'html.parser')
    
    def escape_latex_chars(text):
        chars = {'&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_', '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}', '^': r'\textasciicircum{}', '\\': r'\textbackslash{}'}
        for k, v in chars.items(): text = text.replace(k, v)
        return text
    
    for text_node in soup.find_all(text=True):
        if text_node.parent.name not in ['script', 'style']:
            text_node.replace_with(escape_latex_chars(str(text_node)))
            
    for b in soup.find_all(['b', 'strong']): b.replace_with(f"\\textbf{{{b.decode_contents()}}}")
    for i in soup.find_all(['i', 'em']): i.replace_with(f"\\textit{{{i.decode_contents()}}}")
    for u in soup.find_all(['u']): u.replace_with(f"\\underline{{{u.decode_contents()}}}")
    for h1 in soup.find_all('h1'): h1.replace_with(f"\\section*{{{h1.decode_contents()}}}\n")
    for h2 in soup.find_all('h2'): h2.replace_with(f"\\subsection*{{{h2.decode_contents()}}}\n")
    for h3 in soup.find_all('h3'): h3.replace_with(f"\\subsubsection*{{{h3.decode_contents()}}}\n")
    for p in soup.find_all('p'): p.replace_with(f"{p.decode_contents()}\n\n")
        
    for ul in soup.find_all('ul'):
        items = "".join([f"\\item {li.decode_contents()}\n" for li in ul.find_all('li', recursive=False)])
        ul.replace_with(f"\\begin{{itemize}}\n{items}\\end{{itemize}}\n")
        
    for ol in soup.find_all('ol'):
        items = "".join([f"\\item {li.decode_contents()}\n" for li in ol.find_all('li', recursive=False)])
        ol.replace_with(f"\\begin{{enumerate}}\n{items}\\end{{enumerate}}\n")
        
    body_text = soup.get_text()
    latex_template = r"""\documentclass[12pt, a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage{hyperref}
\usepackage{geometry}
\geometry{margin=1in}

\title{TITLE}
\author{ImoleWrites Research Platform}
\date{\today}

\begin{document}

\maketitle

BODY

\end{document}
"""
    latex_template = latex_template.replace("TITLE", escape_latex_chars(title))
    latex_template = latex_template.replace("BODY", body_text.strip())
    return latex_template
