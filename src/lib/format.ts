export function formatBrl(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Sob consulta';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTimeBr(isoDate: string): string {
  if (!isoDate) return '—';
  const normalized = isoDate.includes('T') ? isoDate : isoDate.replace(' ', 'T') + 'Z';
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export const STUDIO_IMAGE_PRESETS: Array<{label: string; url: string}> = [
  {label: 'Câmera Cinema Rig 8K (Estúdio)', url: '/src/assets/images/hero_cinema_stage_1795521923981.jpg'},
  {label: 'Corpo Câmera Cinema Modular', url: '/src/assets/images/prod_cinema_camera_1795521924293.jpg'},
  {label: 'Conjunto de Lentes Cine Prime', url: '/src/assets/images/prod_cine_lenses_1795521925276.jpg'},
  {label: 'Refletor LED COB Fresnel', url: '/src/assets/images/prod_studio_lighting_1795521925302.jpg'},
  {label: 'Gravador & Áudio Broadcast', url: '/src/assets/images/prod_pro_audio_1795521925833.jpg'},
  {label: 'Switcher 12G-SDI & Monitoração', url: '/src/assets/images/prod_broadcast_switcher_1795521926372.jpg'},
  {label: 'Laboratório Óptico & Showroom', url: '/src/assets/images/editorial_showroom_lab_1795521926922.jpg'},
];
