import {Link} from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-[#09090B] text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5 space-y-3">
            <Link to="/" className="font-display text-lg font-semibold tracking-tight text-zinc-100">
              VideoWeb Center
            </Link>
            <p className="text-sm leading-relaxed text-zinc-400 max-w-sm">
              Distribuidora oficial e integradora de engenharia audiovisual para cinema digital, broadcast e estúdios corporativos no Brasil.
            </p>
            <p className="text-xs text-zinc-500">
              Rua da Mooca, 2518, Sala 71 · Mooca, São Paulo – SP · CEP 03104-002
            </p>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-zinc-200 uppercase">Navegação</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/catalogo" className="hover:text-zinc-100 transition-colors">
                  Catálogo Geral
                </Link>
              </li>
              <li>
                <Link to="/marcas" className="hover:text-zinc-100 transition-colors">
                  Marcas Oficiais
                </Link>
              </li>
              <li>
                <Link to="/solucoes" className="hover:text-zinc-100 transition-colors">
                  Engenharia & Estúdios
                </Link>
              </li>
              <li>
                <Link to="/orcamento" className="hover:text-zinc-100 transition-colors">
                  Solicitar Orçamento
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-zinc-200 uppercase">Especialidades</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/catalogo?categoria=cameras-cinema" className="hover:text-zinc-100 transition-colors">
                  Câmeras & Camcorders
                </Link>
              </li>
              <li>
                <Link to="/catalogo?categoria=cameras-ptz-pov" className="hover:text-zinc-100 transition-colors">
                  Câmeras PTZ & POV
                </Link>
              </li>
              <li>
                <Link to="/catalogo?categoria=transmissao-ip" className="hover:text-zinc-100 transition-colors">
                  Transmissão Sem Fio & IP
                </Link>
              </li>
              <li>
                <Link to="/catalogo?categoria=broadcast-switchers" className="hover:text-zinc-100 transition-colors">
                  Switchers & Broadcast
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-zinc-200 uppercase">Atendimento</h3>
            <div className="space-y-2 text-sm">
              <p className="font-mono text-xs text-zinc-300 tabular-nums">+55 11 98339-9639</p>
              <p className="text-xs text-zinc-400">financeiro@videowebcenter.com.br</p>
              <p className="text-xs text-zinc-500">Seg a Sex · 09h00 às 18h30</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-zinc-800/80 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VideoWeb Center Equipamentos Audiovisuais Ltda. Todos os direitos reservados.</p>
          <p>Garantia Oficial de Fábrica · Laboratório Óptico e Eletrônico Certificado</p>
        </div>
      </div>
    </footer>
  );
}
