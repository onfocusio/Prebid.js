import {
  adagioRtdSubmodule,
} from 'modules/adagioRtdProvider.js';

describe('imRtdProvider', function () {
  describe('adagioRtdSubmodule', function () {
    it('should initalize and return true', function () {
      expect(adagioRtdSubmodule.init()).to.equal(true)
    })
  })
});
