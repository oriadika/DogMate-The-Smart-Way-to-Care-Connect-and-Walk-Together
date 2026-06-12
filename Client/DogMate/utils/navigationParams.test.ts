import { flattenRouteParams } from './navigationParams';

describe('flattenRouteParams', () => {
  it('flattens nested tab route params into a single object', () => {
    const result = flattenRouteParams({
      screen: 'Dashboard',
      params: { userId: '42', userFirstName: 'Avi', userLastName: 'Cohen' },
    });

    expect(result).toEqual({
      userId: '42',
      userFirstName: 'Avi',
      userLastName: 'Cohen',
    });
  });

  it('keeps existing top-level params when there is no nested route object', () => {
    const result = flattenRouteParams({ userId: '7', email: 'a@b.com' });

    expect(result).toEqual({ userId: '7', email: 'a@b.com' });
  });
});
