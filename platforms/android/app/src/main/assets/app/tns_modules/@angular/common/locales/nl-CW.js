/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export default [
    'nl-CW',
    [
        ['a.m.', 'p.m.'],
        ,
    ],
    ,
    [
        ['Z', 'M', 'D', 'W', 'D', 'V', 'Z'], ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
        ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
        ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
    ],
    ,
    [
        ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
        ['jan.', 'feb.', 'mrt.', 'apr.', 'mei', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'],
        [
            'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september',
            'oktober', 'november', 'december'
        ]
    ],
    ,
    [['v.C.', 'n.C.'], ['v.Chr.', 'n.Chr.'], ['voor Christus', 'na Christus']], 1, [6, 0],
    ['dd-MM-yy', 'd MMM y', 'd MMMM y', 'EEEE d MMMM y'],
    ['HH:mm', 'HH:mm:ss', 'HH:mm:ss z', 'HH:mm:ss zzzz'],
    [
        '{1} {0}',
        ,
        '{1} \'om\' {0}',
    ],
    [',', '.', ';', '%', '+', '-', 'E', '×', '‰', '∞', 'NaN', ':'],
    ['#,##0.###', '#,##0%', '¤ #,##0.00;¤ -#,##0.00', '#E0'], 'NAf.',
    'Nederlands-Antilliaanse gulden', function (n) {
        var i = Math.floor(Math.abs(n)), v = n.toString().replace(/^[^.]*\.?/, '').length;
        if (i === 1 && v === 0)
            return 1;
        return 5;
    }
];
//# sourceMappingURL=nl-CW.js.map