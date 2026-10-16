import { describe, expect, it } from 'vitest';
import { normalizeGlobalMerchantPattern } from './merchant-pattern-normalize';

describe('normalizeGlobalMerchantPattern', () => {
  it("collapses dated Bridge City Coffee Square/SP strings", () => {
    expect(
      normalizeGlobalMerchantPattern('SP BRIDGE CITY CO 01/14 PURCHASE GREENVILLE SC')
    ).toBe('bridge city co');

    expect(
      normalizeGlobalMerchantPattern('SP BRIDGE CITY CO 02/03 PURCHASE GREENVILLE SC')
    ).toBe('bridge city co');
  });

  it('strips Square / TST / PayPal processor prefixes', () => {
    expect(normalizeGlobalMerchantPattern('SQ *BRIDGE CITY COFFEE')).toBe('bridge city coffee');
    expect(normalizeGlobalMerchantPattern('TST* STARBUCKS STORE')).toBe('starbucks store');
    expect(normalizeGlobalMerchantPattern('PAYPAL *WALMART')).toBe('walmart');
  });

  it('strips store/terminal numbers, city/state, and INC', () => {
    expect(normalizeGlobalMerchantPattern('ALDI INC BATAVIA IL')).toBe('aldi');
    expect(normalizeGlobalMerchantPattern('TARGET T-1182')).toBe('target');
    expect(normalizeGlobalMerchantPattern('BURGER KING #17020 Q07 TAYLORS SC')).toBe(
      'burger king'
    );
    expect(normalizeGlobalMerchantPattern('WALMART #12345 2024-01-15')).toBe('walmart');
    expect(normalizeGlobalMerchantPattern('TARGET T-98765 PURCHASE AUSTIN TX')).toBe('target');
    expect(normalizeGlobalMerchantPattern('Aldi Greenville Sc')).toBe('aldi');
  });

  it('strips register/terminal letter+digit codes before city/state', () => {
    expect(normalizeGlobalMerchantPattern('SPILL THE BEANS R1 GREENVILLE SC')).toBe(
      'spill the beans'
    );
    expect(normalizeGlobalMerchantPattern('SPILL THE BEANS R2 GREENVILLE SC')).toBe(
      'spill the beans'
    );
    expect(normalizeGlobalMerchantPattern('COFFEE SHOP T1 AUSTIN TX')).toBe('coffee shop');
  });

  it('strips SIGONFILE, reference codes, AUTHORIZED ON, and transfer name tails', () => {
    expect(normalizeGlobalMerchantPattern('SHELL OIL SIGONFILE')).toBe('shell oil');
    expect(normalizeGlobalMerchantPattern('STORE REF# 998877')).toBe('store');
    expect(
      normalizeGlobalMerchantPattern('ATM 123 MAIN ST AUTHORIZED ON 01/15')
    ).toBe('atm 123 main st');
    expect(
      normalizeGlobalMerchantPattern('ACME PAYROLL ACH TO JOHN DOE')
    ).toBe('acme payroll');
    expect(
      normalizeGlobalMerchantPattern('ONLINE TRANSFER TO JONATHAN WADSWORTH')
    ).toBe('');
  });

  it('strips phones, street fragments, and trailing state', () => {
    expect(
      normalizeGlobalMerchantPattern('TST* TROPICAL GRILLE WADE 864-334-5163 SC')
    ).toBe('tropical grille');
    expect(normalizeGlobalMerchantPattern('SOME CAFE 864 334 5163 SC')).toBe('some cafe');
    expect(normalizeGlobalMerchantPattern('SOME CAFE 864.334.5163 SC')).toBe('some cafe');
    expect(normalizeGlobalMerchantPattern('CAFE WOODRUFF RD SC')).toBe('cafe');
    expect(normalizeGlobalMerchantPattern('CAFE HAYWOOD SC')).toBe('cafe');
    expect(normalizeGlobalMerchantPattern('CAFE POINSETT SC')).toBe('cafe');
    expect(normalizeGlobalMerchantPattern('CAFE PELHAM SC')).toBe('cafe');
  });

  it('strips card suffixes and order/confirmation codes', () => {
    expect(normalizeGlobalMerchantPattern('SHELL DEBIT CARD *8115')).toBe('shell');
    expect(normalizeGlobalMerchantPattern('SHELL CARD 4227')).toBe('shell');
    expect(normalizeGlobalMerchantPattern('Amazon MKTPL*AB12CD34')).toBe('amazon');
    expect(normalizeGlobalMerchantPattern('Amazon.com*1A2B3C4D')).toBe('amazon');
    expect(normalizeGlobalMerchantPattern('HOTEL Conf# ABC123')).toBe('hotel');
    expect(normalizeGlobalMerchantPattern('Airbnb G-ABC123XYZ')).toBe('airbnb');
    expect(normalizeGlobalMerchantPattern('Airbnb M-999888')).toBe('airbnb');
    expect(normalizeGlobalMerchantPattern('STORE ST-12345')).toBe('store');
  });

  it('collapses ACH DES:/ID:/INDN: descriptors to company before DES:', () => {
    expect(
      normalizeGlobalMerchantPattern(
        'ACME PAYROLL DES:PAYROLL ID:12345 INDN:JOHN DOE CO ID:999 PPD'
      )
    ).toBe('acme payroll');
    expect(
      normalizeGlobalMerchantPattern('WIDGET CO DES:PAYMENT ID:99 INDN:JANE WEB')
    ).toBe('widget co');
  });

  it('strips additional processor prefixes including GOOGLE*/APPLE*', () => {
    expect(normalizeGlobalMerchantPattern('DD *COFFEE SHOP')).toBe('coffee shop');
    expect(normalizeGlobalMerchantPattern('IC*BAGEL PLACE')).toBe('bagel place');
    expect(normalizeGlobalMerchantPattern('PAR*PIZZA JOINT')).toBe('pizza joint');
    expect(normalizeGlobalMerchantPattern('SumUp *BAKERY')).toBe('bakery');
    expect(normalizeGlobalMerchantPattern('Vagaro_SALON NAME')).toBe('salon name');
    expect(normalizeGlobalMerchantPattern('Nayax **SNACK')).toBe('snack');
    expect(normalizeGlobalMerchantPattern('GOOGLE*YOUTUBE')).toBe('youtube');
    expect(normalizeGlobalMerchantPattern('APPLE*ITUNES.COM')).toBe('itunes com');
    expect(normalizeGlobalMerchantPattern('CM.MERCHANT NAME')).toBe('merchant name');
    expect(normalizeGlobalMerchantPattern('LS MARKET')).toBe('market');
    expect(normalizeGlobalMerchantPattern('PB *BOOKSTORE')).toBe('bookstore');
  });

  it('handles glued and multi-word/truncated trailing cities', () => {
    expect(normalizeGlobalMerchantPattern('STORE TRAVELERS RESSC')).toBe('store');
    expect(normalizeGlobalMerchantPattern('STORE HENDERSONVLLENC')).toBe('store');
    expect(normalizeGlobalMerchantPattern('STORE TRAVELERS RES SC')).toBe('store');
    expect(normalizeGlobalMerchantPattern('STORE HILTON HEAD I SC')).toBe('store');
    expect(normalizeGlobalMerchantPattern('STORE MOUNT PLEASAN SC')).toBe('store');
  });

  it('strips extra store number formats', () => {
    expect(normalizeGlobalMerchantPattern('TARGET 0101 0011')).toBe('target');
    expect(normalizeGlobalMerchantPattern('STORE SK1668')).toBe('store');
    expect(normalizeGlobalMerchantPattern('STORE 110-T001')).toBe('store');
  });

  it('keeps ambiguous brand fragments like BRIDGE CITY CO without purchase cues', () => {
    expect(normalizeGlobalMerchantPattern('BRIDGE CITY CO')).toBe('bridge city co');
  });

  it('does not over-strip brand words', () => {
    expect(normalizeGlobalMerchantPattern('BURGER KING')).toBe('burger king');
    expect(normalizeGlobalMerchantPattern('WHOLE FOODS')).toBe('whole foods');
    expect(normalizeGlobalMerchantPattern('HOME DEPOT')).toBe('home depot');
    expect(normalizeGlobalMerchantPattern('BEST BUY')).toBe('best buy');
  });

  it('returns empty for blank input', () => {
    expect(normalizeGlobalMerchantPattern('')).toBe('');
    expect(normalizeGlobalMerchantPattern('   ')).toBe('');
  });

  it('is stable across casing and extra whitespace', () => {
    expect(normalizeGlobalMerchantPattern('  amazon   mktp  ')).toBe('amazon mktp');
    expect(normalizeGlobalMerchantPattern('Amazon Mktp')).toBe('amazon mktp');
  });
});
