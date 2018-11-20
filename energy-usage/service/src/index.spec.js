const Koa = require('koa');
const { expect } = require('chai');

const server = require('./index');

describe('index', () => {
  it('should create an instance of a Koa server', () => {
    const instance = server();
    expect(instance).to.be.instanceof(Koa);
  });
});
