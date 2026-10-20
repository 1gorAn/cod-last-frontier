// Source rectangles in the transparent atlases; no runtime image editing is needed.
export const SERVER_FRAMES = [
 [0,80,480,425], [480,45,510,460], [990,15,546,490],
 [0,510,525,514], [525,510,650,514],
] as const;
export const SERVER_LEVEL_NAMES = ['Начальный','Стандартный','Промышленный','Высокотехнологичный','Гипермасштабный'] as const;
export const ORBITAL_FRAME = [0,0,1250,1024] as const;
export const ORBITAL_ROCKET_FRAME = [1255,60,280,900] as const;
// The supplied sheet has uneven cell spacing; explicit bounds avoid adjacent poses.
export const PIG_COLUMNS=[30,243,435,625,815,1000,1185,1370,1536] as const;
export const PIG_PIVOTS=[150,340,530,720,910,1090,1275,1450] as const;
export const PIG_ROWS={idle:[35,175],walk:[210,350],attack:[385,545],open:[585,715],hurt:[735,870],death:[870,1024]} as const;
