export type WorkerGame = {
  id: string;
  title: string;
  description: string;
  thumb: string;
  file: string;
  width?: string;
  height?: string;
  platform?: string;
};

type WorkerRequest = {
  xmlText: string;
};

type WorkerResponse = {
  games: WorkerGame[];
  total: number;
};

function getNodeText(parent: Element, tagName: string): string {
  const nsGetter = (parent as any).getElementsByTagNameNS;
  const els =
    typeof nsGetter === 'function'
      ? nsGetter.call(parent, '*', tagName)
      : parent.getElementsByTagName(tagName);
  return (els?.[0]?.textContent || '').trim();
}

function parseGamesXml(xmlText: string): WorkerResponse {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const urlNodes =
    typeof doc.getElementsByTagNameNS === 'function'
      ? doc.getElementsByTagNameNS('*', 'url')
      : doc.getElementsByTagName('url');
  const gameNodes =
    typeof doc.getElementsByTagNameNS === 'function'
      ? doc.getElementsByTagNameNS('*', 'game')
      : doc.getElementsByTagName('game');

  if (gameNodes.length > 0) {
    const total = gameNodes.length;
    const games: WorkerGame[] = [];
    for (let i = 0; i < total; i++) {
      const node = gameNodes[i];
      if (!node) continue;
      games.push({
        id: i.toString(),
        title: getNodeText(node, 'title'),
        description: getNodeText(node, 'description'),
        thumb: getNodeText(node, 'thumb'),
        file: getNodeText(node, 'file'),
        width: getNodeText(node, 'width'),
        height: getNodeText(node, 'height'),
      });
    }
    return { games, total };
  }

  if (urlNodes.length > 0) {
    const total = urlNodes.length;
    const games: WorkerGame[] = [];
    for (let i = 0; i < total; i++) {
      const node = urlNodes[i];
      if (!node) continue;
      const loc = getNodeText(node, 'loc');
      const imageLoc = (() => {
        const nsGetter = (node as any).getElementsByTagNameNS;
        const els =
          typeof nsGetter === 'function'
            ? nsGetter.call(node, '*', 'loc')
            : (node as any).getElementsByTagName?.('loc') || [];
        return (els?.[1]?.textContent || '').trim();
      })();
      const idMatch = loc.match(/\/([a-f0-9]{32})\/?$/);
      const id = idMatch ? idMatch[1] : `game-${i}`;
      const title = `HTML5 Game ${id.substring(0, 8)}`;
      games.push({
        id,
        title,
        description: 'Play this HTML5 game instantly in your browser. No downloads required!',
        thumb: imageLoc,
        file: loc,
        width: '800',
        height: '600',
        platform: 'html5',
      });
    }
    return { games, total };
  }

  return { games: [], total: 0 };
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { xmlText } = event.data;
  const response = parseGamesXml(xmlText);
  self.postMessage(response);
};
