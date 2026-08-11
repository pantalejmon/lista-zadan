import { ListedQuantities } from './listed-quantities';

describe('ListedQuantities', () => {
  it('sumuje ilości w tej samej jednostce', () => {
    const listed = new ListedQuantities();
    listed.add(500, 'g');
    listed.add(250, 'g');

    expect(listed.quantityIn('g')).toBe(750);
    expect(listed.hasUncountable('g')).toBe(false);
  });

  it('pozycja bez jednostki dolicza się do potrzeby w dowolnej jednostce', () => {
    const listed = new ListedQuantities();
    listed.add(2, null);

    expect(listed.quantityIn('szt')).toBe(2);
    expect(listed.hasUncountable('szt')).toBe(false);
  });

  it('pozycja bez ilości jest nieprzeliczalna — potrzebę uznajemy za załatwioną', () => {
    const listed = new ListedQuantities();
    listed.add(null, null);

    expect(listed.quantityIn('g')).toBe(0);
    expect(listed.hasUncountable('g')).toBe(true);
  });

  it('inna jednostka nie odejmuje się od potrzeby, ale ją zamyka', () => {
    // „2 opak." wobec potrzeby w gramach: nie umiemy przeliczyć, więc nie
    // dokładamy drugi raz tego samego.
    const listed = new ListedQuantities();
    listed.add(2, 'opak.');

    expect(listed.quantityIn('g')).toBe(0);
    expect(listed.hasUncountable('g')).toBe(true);
  });

  it('jednostki porównuje bez względu na wielkość liter i spacje', () => {
    const listed = new ListedQuantities();
    listed.add(300, ' G ');

    expect(listed.quantityIn('g')).toBe(300);
    expect(listed.hasUncountable('g')).toBe(false);
  });
});
