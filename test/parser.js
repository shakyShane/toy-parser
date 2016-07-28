var assert = require('assert');
var hb = require('../');

const subject = `<ul>
    {{#each links}}
    <li><a href="{{this.url}}">{{this.label}}</a></li>
    {{/each}}
</ul>`;

describe('ast parsing', function () {
    it('transforms tokens -> ast', function () {
        const tokens = hb.tokenize(subject);

        // console.log(tokens.map(x => [x.type, x.content]));

        console.log(tokens);
        // assert.equal(tokens[0].content, '<ul>\n');
        // assert.equal(tokens[1].content, '{{');
        // assert.equal(tokens[2].content, '#each');
        // assert.equal(tokens[3].content, '<ul>\n');
    });
});
