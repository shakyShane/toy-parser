var assert = require('assert');
var hb = require('../');


describe('ast parsing', function () {

    it('transforms tokens -> ast', function () {
        const subject = `<ul>
    {{@inc links inc="shane"}}
</ul>`;
        const tokens = hb.tokenize(subject);

        // console.log(tokens[1]);
        // console.log(tokens[1]);
        // console.log([subject.substring(0, 4)]);
        // console.log([subject.charAt(4)]);
        // console.log(tokens[0].loc.column);
        // console.log(tokens[1].loc.column);
        // console.log(tokens[1].loc.column, 4);

        // assert.equal(tokens[0].loc.column, 0);
        // assert.equal(tokens[1].loc.column, 4);
        // assert.equal(tokens[2].loc.column, 0);
        console.log(tokens);
        // assert.equal(subject.substring(tokens[0].loc.start, tokens[0].loc.end), '<ul>\n');
        // assert.equal(subject.substring(tokens[1].loc.start, tokens[1].loc.end), '{{@inc links inc="shane"}}');
        // assert.equal(subject.substring(tokens[1].loc.start, tokens[1].loc.end), '{{@inc links inc="shane"}}');

        // assert.equal(subject.substring(tokens[2].loc.start, tokens[2].loc.end), '</ul>');
        // assert.equal(tokens[0].content, '<ul>\n');
        // assert.equal(tokens[1].content, '{{');
        // assert.equal(tokens[2].content, '#each');
        // assert.equal(tokens[3].content, '<ul>\n');
    });
    it.only('works with nested', function () {
        var sub = `<ul>
    {{#each posts}}
    {{this.url name="shane"}} 
    {{/each}}
</ul>`;
        var tokens = hb.tokenize(sub);
        console.log(tokens.map(x => [x.loc.line, x.loc.column, x.content]));
    });
});
