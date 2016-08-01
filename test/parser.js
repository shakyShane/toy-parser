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
    it('works with nested', function () {
        var sub = `<ul>
    {{#each posts filter=hl}}
    <li><a href="{{this.url|siteurl name="{{this.kittie}}">{{this.label}}</a></li>
    {{/each}}
</ul>`;
        var tokens     = hb.tokenize(sub);
        var ast        = hb.parse(tokens);
        // console.log(JSON.stringify(ast, null, 2));
        console.log(ast[1]);
    });
    it.only('Supports RAW blocks out of the box', function () {
        var sub = `<ul>
    {{*hl lang="js"}}
hewe {{this}}
    {{/hl}}
</ul>`;
        var tokens     = hb.tokenize(sub);
        // console.log(tokens);
        var ast        = hb.parse(tokens);
        console.log(ast);
        // console.log(JSON.stringify(ast, null, 2));
        // console.log(ast[1]);
    });
});
