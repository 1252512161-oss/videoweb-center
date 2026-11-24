import {ArrowRight, CheckCircle2} from 'lucide-react';
import {Link} from 'react-router-dom';
import {MediaImage} from '../components/MediaImage';
import {useSeo} from '../hooks/useSeo';

const SOLUTIONS = [
  {
    number: '01',
    title: 'Arquitetura de Estúdios & Produção Virtual LED',
    description:
      'Projeto luminotécnico, gradeamento motorizado, painéis de LED de alto refresh rate, sistemas de rastreamento de câmera e sincronização genlock/PTP.',
    deliverables: [
      'Estudo luminotécnico 3D e dimensionamento elétrico/DMX',
      'Comissionamento de câmeras cinema com sincronia genlock',
      'Treinamento operacional para equipe residente',
    ],
  },
  {
    number: '02',
    title: 'Master Control Broadcast & Unidades Móveis 12G-SDI',
    description:
      'Integração completa de switchers M/E, matrizes de vídeo IP/12G-SDI, intercomunicação matricial, fibra óptica tática e monitoração HDR calibrada.',
    deliverables: [
      'Diagrama unifilar completo e montagem certificada de racks',
      'Redundância de energia, sinais e gravação multi-canal',
      'Contratos de SLA com suporte presencial em eventos',
    ],
  },
  {
    number: '03',
    title: 'Laboratório de Colimação Óptica & Assistência Técnica',
    description:
      'Pista de projeção óptica e colimação milimétrica para objetivas PL, LPL e EF, além de limpeza de sensores e manutenção preventiva eletrônica.',
    deliverables: [
      'Calibração de backfocus e escala de distância em bancada',
      'Laudo técnico MTF e certificação pré-locação ou pré-rodagem',
      'Peças originais com rastreabilidade de fabricante',
    ],
  },
  {
    number: '04',
    title: 'Consultoria de Fluxo RAW & Pós-Produção HDR',
    description:
      'Especificação de storages compartilhados NVMe/100GbE, estações DaVinci Resolve Studio, monitores de referência OLED e pipelines ACES.',
    deliverables: [
      'Dimensionamento de armazenamento para fluxos 8K RAW/X-OCN',
      'Calibração colorimétrica 3D LUT com sonda espectrofotométrica',
      'Integração entre captação em set e ilha de finalização',
    ],
  },
];

export function SolutionsPage() {
  useSeo({
    title: 'Engenharia de Estúdios e Equipamentos para Produtoras',
    description:
      'Soluções turnkey de engenharia audiovisual, iluminação cinematográfica, integração broadcast 12G-SDI, colimação óptica e acessórios para produção audiovisual.',
    canonicalPath: '/solucoes',
    ogImage: '/src/assets/images/editorial_showroom_lab_1795521926922.jpg',
    breadcrumbs: [
      {name: 'Início', path: '/'},
      {name: 'Soluções', path: '/solucoes'},
    ],
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="grid grid-cols-1 gap-10 border-b border-zinc-800/80 pb-12 lg:grid-cols-12 lg:items-stretch">
        <div className="flex flex-col justify-center lg:col-span-6">
          <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Engenharia Aplicada</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl text-balance">
            Do projeto executivo ao sinal no ar com confiabilidade broadcast.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400 max-w-xl">
            A divisão de engenharia da VideoWeb Center atua lado a lado com emissoras, produtoras cinematográficas, igrejas, universidades e auditórios corporativos na especificação, montagem e sustentação de infraestruturas audiovisuais críticas.
          </p>
          <div className="mt-7">
            <Link
              to="/orcamento"
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
            >
              <span>Solicitar Reunião com Engenharia</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="h-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
            <MediaImage
              src="/src/assets/images/editorial_showroom_lab_1795521926922.jpg"
              alt="Laboratório técnico e bancada de engenharia audiovisual da VideoWeb Center"
              aspectClass="aspect-[16/9] lg:h-full"
              priority
            />
          </div>
        </div>
      </div>

      {/* Editorial Numbered Services */}
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
        {SOLUTIONS.map((sol) => (
          <section key={sol.number} className="rounded-lg border border-zinc-800 bg-[#121216] p-7">
            <p className="font-mono text-xs font-semibold text-amber-400 tabular-nums">{sol.number}.</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-zinc-100">{sol.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{sol.description}</p>

            <ul className="mt-5 space-y-2.5 border-t border-zinc-800/80 pt-5">
              {sol.deliverables.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
