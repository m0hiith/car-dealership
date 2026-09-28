import { describe, expect, it } from 'vitest';
import { carSeoTitle } from '@/lib/car-options';

describe('carSeoTitle', () => {
  it('appends fuel and gearbox when the variant does not already say them', () => {
    expect(
      carSeoTitle({
        name: '2020 Maruti Suzuki Swift ZXi Plus',
        variant: 'ZXi Plus',
        fuelType: 'petrol',
        transmission: 'manual',
        city: 'Hyderabad',
      }),
    ).toBe('2020 Maruti Suzuki Swift ZXi Plus Petrol MT for sale in Hyderabad');
  });

  it('does not repeat fuel or gearbox words already in an Indian trim name', () => {
    expect(
      carSeoTitle({
        name: '2021 Hyundai Creta SX (O) 1.5 Diesel AT',
        variant: 'SX (O) 1.5 Diesel AT',
        fuelType: 'diesel',
        transmission: 'torque_converter',
        city: 'Hyderabad',
      }),
    ).toBe('2021 Hyundai Creta SX (O) 1.5 Diesel AT for sale in Hyderabad');
  });

  it('adds only the missing half when the variant names just one of them', () => {
    expect(
      carSeoTitle({
        name: '2022 Tata Nexon XZ Plus Petrol',
        variant: 'XZ Plus Petrol',
        fuelType: 'petrol',
        transmission: 'manual',
        city: 'Secunderabad',
      }),
    ).toBe('2022 Tata Nexon XZ Plus Petrol MT for sale in Secunderabad');

    expect(
      carSeoTitle({
        name: '2019 Honda City VX CVT',
        variant: 'VX CVT',
        fuelType: 'petrol',
        transmission: 'cvt',
        city: 'Hyderabad',
      }),
    ).toBe('2019 Honda City VX CVT Petrol for sale in Hyderabad');
  });

  it('drops "in <city>" with no registration city', () => {
    expect(
      carSeoTitle({ name: '2022 Kia Seltos HTX', variant: 'HTX', fuelType: 'petrol', transmission: 'cvt', city: null }),
    ).toBe('2022 Kia Seltos HTX Petrol AT for sale');
  });

  it('works with no variant at all', () => {
    expect(
      carSeoTitle({ name: '2022 Kia Seltos', variant: null, fuelType: 'diesel', transmission: 'manual', city: 'Hyderabad' }),
    ).toBe('2022 Kia Seltos Diesel MT for sale in Hyderabad');
  });
});
