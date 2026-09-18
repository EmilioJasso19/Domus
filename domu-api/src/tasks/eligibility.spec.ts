import { hasMemberRole, isEligibleResponsible } from './eligibility';
import { RoleName } from '@/role/constants/roles.constants';

const participant = (role: RoleName): any => ({ role: { name: role } });

describe('isEligibleResponsible', () => {
  it('members_only=true: MEMBER es elegible, OWNER no', () => {
    const task = { members_only: true };
    expect(isEligibleResponsible(task, participant(RoleName.MEMBER))).toBe(
      true,
    );
    expect(isEligibleResponsible(task, participant(RoleName.OWNER))).toBe(
      false,
    );
  });

  it('members_only=false: MEMBER y OWNER son elegibles', () => {
    const task = { members_only: false };
    expect(isEligibleResponsible(task, participant(RoleName.MEMBER))).toBe(
      true,
    );
    expect(isEligibleResponsible(task, participant(RoleName.OWNER))).toBe(true);
  });
});

describe('hasMemberRole', () => {
  it('true cuando al menos un participante es MEMBER', () => {
    expect(
      hasMemberRole([
        participant(RoleName.OWNER),
        participant(RoleName.MEMBER),
      ]),
    ).toBe(true);
  });

  it('false cuando no hay ningún MEMBER', () => {
    expect(hasMemberRole([participant(RoleName.OWNER)])).toBe(false);
    expect(hasMemberRole([])).toBe(false);
  });
});
