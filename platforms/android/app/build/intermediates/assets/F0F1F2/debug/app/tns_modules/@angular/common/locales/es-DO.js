/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export default [
    'es-DO',
    [
        ['a. m.', 'p. m.'],
        ,
    ],
    ,
    [
        ['D', 'L', 'M', 'M', 'J', 'V', 'S'], ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'],
        ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
        ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA']
    ],
    ,
    [
        ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
        [
            'ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'
        ],
        [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
            'octubre', 'noviembre', 'diciembre'
        ]
    ],
    ,
    [['a. C.', 'd. C.'], , ['antes de Cristo', 'después de Cristo']], 0, [6, 0],
    ['d/M/yy', 'd MMM y', 'd \'de\' MMMM \'de\' y', 'EEEE, d \'de\' MMMM \'de\' y'],
    ['h:mm a', 'h:mm:ss a', 'h:mm:ss a z', 'h:mm:ss a zzzz'],
    [
        '{1} {0}',
        ,
        '{1}, {0}',
    ],
    ['.', ',', ';', '%', '+', '-', 'E', '×', '‰', '∞', 'NaN', ':'],
    ['#,##0.###', '#,##0 %', '¤#,##0.00', '#E0'], 'RD$', 'peso dominicano', function (n) {
        if (n === 1)
            return 1;
        return 5;
    }
];
//# sourceMappingURL=es-DO.js.map