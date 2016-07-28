var assert = require('assert');
var hb = require('../');

const subject = `<ul>
    {{@inc links inc="shane"}}
</ul>`;

describe('ast parsing', function () {
    it('transforms tokens -> ast', function () {
        const tokens = hb.tokenize(subject);

        // console.log(tokens.map(x => [x.type, x.content]));
        console.log(tokens);

        console.log(subject.substring(tokens[1].params[0].loc.start, tokens[1].params[0].loc.end));
        console.log(subject.substring(tokens[1].params[1].loc.start, tokens[1].params[1].loc.end));
        // assert.equal(tokens[0].content, '<ul>\n');
        // assert.equal(tokens[1].content, '{{');
        // assert.equal(tokens[2].content, '#each');
        // assert.equal(tokens[3].content, '<ul>\n');
    });
});
