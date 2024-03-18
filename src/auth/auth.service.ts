import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EMPTY, from, Observable, of } from 'rxjs';
import { mergeMap, map, throwIfEmpty } from 'rxjs/operators';
import { UserService } from '../user/user.service';
import { AccessToken } from './interface/access-token.interface';
import { JwtPayload } from './interface/jwt-payload.interface';
import { UserPrincipal } from './interface/user-principal.interface';
import { AMPLIFY_CONNECTION, USER } from 'cognito/cognito.constants';
import { AttributePrincipal } from './interface/attribute-principal.interface';
import { VerifyRequest } from './interface/verify-request.interface';
import { ProfileService } from 'profile/profile.service';
import { CreateProfileRequest } from 'profile/interface/create-profile-request.interface';
import { CreateProfileDto } from 'profile/dto/create-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private profileService: ProfileService,
    @Inject(AMPLIFY_CONNECTION) private readonly amplify: any,
  ) {}

  validateUser(username: string, pass: string): Observable<UserPrincipal> {
    return this.userService.findByUsername(username).pipe(
      //if user is not found, convert it into an EMPTY.
      mergeMap((p) => (p ? of(p) : EMPTY)),

      // Using a general message in the authentication progress is more reasonable.
      // Concise info could be considered for security.
      // Detailed info will be helpful for crackers.
      // throwIfEmpty(() => new NotFoundException(`username:${username} was not found`)),
      throwIfEmpty(
        () => new UnauthorizedException(`username or password is not matched`),
      ),

      mergeMap((user) => {
        const { _id, password, username, email, roles } = user;
        return user.comparePassword(pass).pipe(
          map((m) => {
            if (m) {
              return { id: _id, username, email, roles } as UserPrincipal;
            } else {
              // The same reason above.
              //throw new UnauthorizedException('password was not matched.')
              throw new UnauthorizedException(
                'username or password is not matched',
              );
            }
          }),
        );
      }),
    );
  }

  // If `LocalStrateg#validateUser` return a `Observable`, the `request.user` is
  // bound to a `Observable<UserPrincipal>`, not a `UserPrincipal`.
  //
  // I would like use the current `Promise` for this case, thus it will get
  // a `UserPrincipal` here directly.
  //
  login(user: UserPrincipal): Observable<AccessToken> {
    //console.log(user);
    const payload: JwtPayload = {
      upn: user.username, //upn is defined in Microprofile JWT spec, a human readable principal name.
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };
    return from(this.jwtService.signAsync(payload)).pipe(
      map((access_token) => {
        return { access_token };
      }),
    );
  }

  register(
    email: string,
    attributes: AttributePrincipal,
    group: string,
  ): Observable<any> {
    const amplifyInstance = this.amplify();

    const signUp = amplifyInstance.registerUser(email, attributes, group);
    return from(signUp).pipe(
      map((response: CognitoUser) => {
        const payload: CreateProfileDto = {
          userId: response.UserSub,
          firstName: attributes.given_name,
          lastName: attributes.family_name,
          emailId: email,
          role: [group, USER],
          type: 'doctor',
          dob: '',
          mobileNumber: ''
        };
        this.profileService.create(payload);
        return response;
      }),
    );
  }

  requestOtp(email: string): Observable<any> {
    const amplifyInstance = this.amplify();
    const response = amplifyInstance.requestOtp(email);
    return from(response).pipe(
      map((response) => {
        return response;
      }),
    );
  }

  verifyOtp(payload: VerifyRequest): Observable<any> {
    const amplifyInstance = this.amplify();
    const response = amplifyInstance.verifyOtp(payload);
    return from(response).pipe(
      map((response) => {
        return response;
      }),
    );
  }
}
