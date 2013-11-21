'use strict';

describe('Directive: dataTable', function () {

  // load the directive's module
  beforeEach(module('angularTableApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<data-table></data-table>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the dataTable directive');
  }));
});
