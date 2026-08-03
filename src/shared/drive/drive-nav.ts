/** Navegação entre grupos/pastas sem depender do cache do IonRouterOutlet. */

export function isDrivePath(pathname: string) {
  return (
    pathname.startsWith('/subjects/') ||
    pathname.startsWith('/topics/') ||
    pathname.startsWith('/arvore') ||
    pathname === '/home'
  );
}

export function subjectHref(subjectId: string) {
  return `/subjects/${subjectId}`;
}

export function topicHref(subjectId: string, topicId: string) {
  return `/topics/${topicId}?subjectId=${encodeURIComponent(subjectId)}`;
}
