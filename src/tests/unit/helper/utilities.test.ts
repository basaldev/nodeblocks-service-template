import { getEnvString, getEnvBool } from '../../../helper/utilities';

describe('utilities', () => {
  describe('getEnvString', () => {
    it('should return the value of the environment variable', () => {
      process.env.TEST = 'test';
      expect(getEnvString('TEST')).toEqual('test');
    });

    it('should return the default value when environment variable does not exist', () => {
      expect(getEnvString('NOT_EXIST', 'It does actually')).toEqual('It does actually');
    });
  });

  describe('getEnvBool', () => {
    it('should return the boolean value of the environment variable', () => {
      process.env.TEST = 'true';
      expect(getEnvBool('TEST')).toEqual(true);
    });

    it('should return the default value when environment variable does not exist', () => {
      expect(getEnvBool('NOT_EXIST', true)).toEqual(true);
    });
  });
});
