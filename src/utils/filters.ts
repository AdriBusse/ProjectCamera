
export interface FilterType {
    name: string;
    matrix: number[];
    gradientBackground: string[];
}

// Helper to generate identity matrix
const IDENTITY_MATRIX = [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
];

export const FILTERS: FilterType[] = [
    {
        name: 'Normal',
        matrix: IDENTITY_MATRIX,
        gradientBackground: ['#888888', '#444444']
    },
    {
        name: 'Sepia',
        matrix: [
            0.393, 0.769, 0.189, 0, 0,
            0.349, 0.686, 0.168, 0, 0,
            0.272, 0.534, 0.131, 0, 0,
            0, 0, 0, 1, 0,
        ],
        gradientBackground: ['#C0A080', '#5E4B35']
    },
    {
        name: 'B&W',
        matrix: [
            0.2126, 0.7152, 0.0722, 0, 0,
            0.2126, 0.7152, 0.0722, 0, 0,
            0.2126, 0.7152, 0.0722, 0, 0,
            0, 0, 0, 1, 0,
        ],
        gradientBackground: ['#CCCCCC', '#333333']
    },
    {
        name: 'Polaroid',
        matrix: [
            1.438, -0.062, -0.062, 0, 0,
            -0.122, 1.378, -0.122, 0, 0,
            -0.016, -0.016, 1.483, 0, 0,
            0, 0, 0, 1, 0,
        ],
        gradientBackground: ['#F0F0E0', '#A0A090']
    },
    {
        name: 'Invert',
        matrix: [
            -1, 0, 0, 1, 1,
            0, -1, 0, 1, 1,
            0, 0, -1, 1, 1,
            0, 0, 0, 1, 0,
        ],
        gradientBackground: ['#FFFFFF', '#000000']
    },
    {
        name: 'Kodachrome',
        matrix: [
            1.4, 0, 0, 0, -0.04,
            0, 1.3, 0, 0, -0.04,
            0, 0, 1.0, 0, -0.04,
            0, 0, 0, 1, 0,
        ],
        gradientBackground: ['#FFCC33', '#CC3333']
    },
    {
        name: 'Vintage',
        matrix: [
            0.6279345635605962, 0.32021834208361486, -0.039654081111151475, 0, 0.03784525,
            0.025787173635795064, 0.6441188644374771, 0.03259127327530635, 0, 0.029267,
            0.0466055556782719, -0.0851232987247891, 0.5241648018700465, 0, 0.020227,
            0, 0, 0, 1, 0,
        ],
        gradientBackground: ['#E0D0FF', '#7050A0']
    },
    {
        name: 'Warm',
        matrix: [
            1.06, 0, 0, 0, 0,
            0, 1.01, 0, 0, 0,
            0, 0, 0.93, 0, 0,
            0, 0, 0, 1, 0,
        ],
        gradientBackground: ['#FFD700', '#FF8C00']
    },
    {
        name: 'Cool',
        matrix: [
            0.99, 0, 0, 0, 0,
            0, 0.93, 0, 0, 0,
            0, 0, 1.08, 0, 0,
            0, 0, 0, 1, 0,
        ],
        gradientBackground: ['#00FFFF', '#0077FF']
    },
];
